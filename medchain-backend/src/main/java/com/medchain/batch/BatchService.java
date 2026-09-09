package com.medchain.batch;

import com.medchain.ai.AiRiskClient;
import com.medchain.ai.dto.BlockchainEventRecordDto;
import com.medchain.ai.dto.RiskAnalysisRequest;
import com.medchain.ai.dto.RiskAnalysisResponse;
import com.medchain.ai.dto.TransferRecordDto;
import com.medchain.auth.User;
import com.medchain.batch.dto.BatchDetailResponse;
import com.medchain.batch.dto.BatchSummaryResponse;
import com.medchain.batch.dto.CreateBatchRequest;
import com.medchain.batch.dto.TimelineStepResponse;
import com.medchain.blockchain.BlockchainClient;
import com.medchain.blockchain.BlockchainEvent;
import com.medchain.blockchain.BlockchainEventRepository;
import com.medchain.blockchain.dto.BlockchainEventResponse;
import com.medchain.common.exception.ResourceNotFoundException;
import com.medchain.org.Organization;
import com.medchain.transfer.Transfer;
import com.medchain.transfer.TransferRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BatchService {

    private final BatchRepository batchRepository;
    private final TransferRepository transferRepository;
    private final BlockchainEventRepository blockchainEventRepository;
    private final BlockchainClient blockchainClient;
    private final AiRiskClient aiRiskClient;
    private final com.medchain.audit.AuditEventService auditEventService;

    @Transactional
    public BatchDetailResponse createBatch(CreateBatchRequest request, User currentUser) {
        Organization manufacturer = currentUser.getOrganization();
        String batchId = generateBatchId();

        MedicineBatch batch = MedicineBatch.builder()
                .id(batchId)
                .batchNumber(batchId)
                .medicineName(request.medicineName())
                .manufacturer(manufacturer)
                .manufacturingDate(request.manufacturingDate())
                .expiryDate(request.expiryDate())
                .quantity(request.quantity())
                .currentOwner(manufacturer)
                .status(BatchStatus.CREATED)
                .createdAt(java.time.Instant.now())
                .updatedAt(java.time.Instant.now())
                .build();

        MedicineBatch savedBatch = batchRepository.save(batch);

        auditEventService.record(savedBatch, com.medchain.audit.AuditEventType.BATCH_CREATED, currentUser.getName(),
                manufacturer.getName(), "Batch registered with quantity " + savedBatch.getQuantity());

        var onChainEvent = blockchainClient.recordBatchCreated(savedBatch);
        onChainEvent.ifPresent(ev -> auditEventService.record(
                savedBatch, com.medchain.audit.AuditEventType.BLOCKCHAIN_RECORDED, "Relayer", "Blockchain",
                "Recorded BATCH_CREATED in block " + ev.getBlockNumber() + " (tx: " + ev.getTxHash() + ")"));

        refreshRisk(savedBatch);

        return getDetail(savedBatch.getId());
    }

    public List<BatchSummaryResponse> listAll() {
        return batchRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(BatchSummaryResponse::from)
                .toList();
    }

    public List<BatchSummaryResponse> listForUser(User currentUser) {
        if (currentUser.getRole() == com.medchain.auth.Role.ADMIN) {
            return listAll();
        }
        Organization org = currentUser.getOrganization();
        return batchRepository.findAllByManufacturerOrCurrentOwnerOrderByCreatedAtDesc(org, org)
                .stream().map(BatchSummaryResponse::from).toList();
    }

    public MedicineBatch getBatchOrThrow(String id) {
        return batchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No batch found with id " + id));
    }

    public BatchDetailResponse getDetail(String id) {
        MedicineBatch batch = getBatchOrThrow(id);
        List<Transfer> transfers = transferRepository.findAllByBatchOrderByInitiatedAtAsc(batch);
        List<BlockchainEvent> events = blockchainEventRepository.findAllByBatchOrderByTimestampAsc(batch);
        List<com.medchain.audit.AuditEvent> auditEvents = auditEventService.getTimelineForBatch(batch);

        List<TimelineStepResponse> timeline = (auditEvents != null && !auditEvents.isEmpty())
                ? TimelineBuilder.buildFromAuditEvents(batch, auditEvents)
                : TimelineBuilder.build(batch, transfers, events);

        return new BatchDetailResponse(
                batch.getId(),
                batch.getBatchNumber(),
                batch.getMedicineName(),
                batch.getManufacturer().getName(),
                batch.getManufacturingDate(),
                batch.getExpiryDate(),
                batch.getQuantity(),
                batch.getCurrentOwner().getName(),
                batch.getStatus(),
                batch.getRiskScore(),
                batch.getRiskLevel(),
                batch.getRiskReason(),
                batch.getRiskRecommendation(),
                batch.getCreatedAt(),
                batch.getUpdatedAt(),
                events.stream().map(BlockchainEventResponse::from).toList(),
                timeline
        );
    }

    @Transactional
    public void markInTransit(MedicineBatch batch) {
        batch.setStatus(BatchStatus.IN_TRANSIT);
        batchRepository.save(batch);
    }

    @Transactional
    public void markReceived(MedicineBatch batch, Organization newOwner) {
        batch.setStatus(BatchStatus.RECEIVED);
        batch.setCurrentOwner(newOwner);
        batchRepository.save(batch);
    }

    @Transactional
    public void markVerified(MedicineBatch batch) {
        if (batch.getStatus() == BatchStatus.RECEIVED) {
            batch.setStatus(BatchStatus.VERIFIED);
            batchRepository.save(batch);
        }
    }

    @Transactional
    public void markRecalled(MedicineBatch batch) {
        batch.setStatus(BatchStatus.RECALLED);
        batchRepository.save(batch);
    }

    @Transactional
    public BatchDetailResponse recall(String id, com.medchain.auth.User currentUser) {
        MedicineBatch batch = getBatchOrThrow(id);

        if (!batch.getManufacturer().getId().equals(currentUser.getOrganization().getId())) {
            throw new com.medchain.common.exception.ForbiddenActionException(
                    "Only the manufacturer that created this batch can recall it.");
        }

        markRecalled(batch);
        auditEventService.record(batch, com.medchain.audit.AuditEventType.RECALL_CREATED,
                currentUser.getName(), currentUser.getOrganization().getName(),
                "Batch recalled by manufacturer");

        var recallOnChain = blockchainClient.recordRecalled(batch);
        recallOnChain.ifPresent(ev -> auditEventService.record(
                batch, com.medchain.audit.AuditEventType.BLOCKCHAIN_RECORDED, "Relayer", "Blockchain",
                "Recorded RECALLED on-chain (tx: " + ev.getTxHash() + ")"));

        refreshRisk(batch);

        return getDetail(id);
    }

    /**
     * Recomputes risk by sending the batch's current transfer/blockchain
     * history to the AI service and caching the result. Called after every
     * state-changing operation (create, transfer, verify, recall) so the
     * cached score never goes stale for more than one request.
     */
    @Transactional
    public void refreshRisk(MedicineBatch batch) {
        List<Transfer> transfers = transferRepository.findAllByBatchOrderByInitiatedAtAsc(batch);
        List<BlockchainEvent> events = blockchainEventRepository.findAllByBatchOrderByTimestampAsc(batch);

        RiskAnalysisRequest request = new RiskAnalysisRequest(
                batch.getId(),
                batch.getStatus().name(),
                batch.getManufacturingDate(),
                batch.getExpiryDate(),
                transfers.stream()
                        .map(t -> new TransferRecordDto(
                                t.getFromOrg().getName(),
                                t.getToOrg().getName(),
                                t.getInitiatedAt(),
                                t.getReceivedAt()))
                        .toList(),
                events.stream()
                        .map(e -> new BlockchainEventRecordDto(e.getType().name(), e.getTimestamp()))
                        .toList(),
                java.time.Instant.now()
        );

        aiRiskClient.analyze(request).ifPresentOrElse(
                (RiskAnalysisResponse risk) -> {
                    batch.setRiskScore(risk.riskScore());
                    batch.setRiskLevel(RiskLevel.valueOf(risk.riskLevel()));
                    batch.setRiskReason(risk.reason());
                    batch.setRiskRecommendation(risk.recommendation());
                    batchRepository.save(batch);
                },
                () -> log.warn("AI risk service unavailable; keeping previous risk values for batch {}",
                        batch.getId())
        );
    }

    private String generateBatchId() {
        int year = LocalDate.now(ZoneOffset.UTC).getYear();
        long sequence = batchRepository.count() + 1;
        String id = String.format("MC-%d-%05d", year, sequence);
        while (batchRepository.existsById(id)) {
            sequence++;
            id = String.format("MC-%d-%05d", year, sequence);
        }
        return id;
    }
}
