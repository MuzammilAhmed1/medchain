package com.medchain.transfer;

import com.medchain.auth.User;
import com.medchain.batch.BatchService;
import com.medchain.batch.BatchStatus;
import com.medchain.batch.MedicineBatch;
import com.medchain.blockchain.BlockchainClient;
import com.medchain.common.exception.BadRequestException;
import com.medchain.common.exception.ForbiddenActionException;
import com.medchain.common.exception.ResourceNotFoundException;
import com.medchain.org.Organization;
import com.medchain.org.OrganizationRepository;
import com.medchain.transfer.dto.InitiateTransferRequest;
import com.medchain.transfer.dto.TransferResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransferService {

    private final TransferRepository transferRepository;
    private final OrganizationRepository organizationRepository;
    private final BatchService batchService;
    private final BlockchainClient blockchainClient;
    private final com.medchain.audit.AuditEventService auditEventService;

    @Transactional
    public TransferResponse initiate(InitiateTransferRequest request, User currentUser) {
        MedicineBatch batch = batchService.getBatchOrThrow(request.batchId());

        if (!batch.getCurrentOwner().getId().equals(currentUser.getOrganization().getId())) {
            throw new ForbiddenActionException("Only the current owner of this batch can initiate a transfer.");
        }
        if (batch.getStatus() == BatchStatus.RECALLED) {
            throw new BadRequestException("This batch has been recalled and cannot be transferred.");
        }
        if (batch.getStatus() == BatchStatus.IN_TRANSIT) {
            throw new BadRequestException("This batch already has a transfer in progress.");
        }

        Organization fromOrg = currentUser.getOrganization();
        if (fromOrg.getType() == com.medchain.org.OrgType.PHARMACY) {
            throw new BadRequestException("Pharmacies dispense medicine directly to patients and cannot transfer batches onward.");
        }

        Organization toOrg = organizationRepository.findByName(request.toOrganizationName())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Target organization not found: " + request.toOrganizationName()));

        if (fromOrg.getId().equals(toOrg.getId())) {
            throw new BadRequestException("Cannot transfer a batch to your own organization.");
        }

        // Enforce strict supply chain role progression:
        // MANUFACTURER -> DISTRIBUTOR -> PHARMACY
        if (fromOrg.getType() == com.medchain.org.OrgType.MANUFACTURER && toOrg.getType() != com.medchain.org.OrgType.DISTRIBUTOR) {
            throw new BadRequestException("Manufacturers can only transfer medicine batches to Distributors.");
        }
        if (fromOrg.getType() == com.medchain.org.OrgType.DISTRIBUTOR && toOrg.getType() != com.medchain.org.OrgType.PHARMACY) {
            throw new BadRequestException("Distributors can only transfer medicine batches to Pharmacies.");
        }

        Transfer transfer = transferRepository.save(Transfer.builder()
                .batch(batch)
                .fromOrg(fromOrg)
                .toOrg(toOrg)
                .status(TransferStatus.INITIATED)
                .initiatedAt(Instant.now())
                .build());

        batchService.markInTransit(batch);

        auditEventService.record(batch, com.medchain.audit.AuditEventType.TRANSFER_INITIATED,
                currentUser.getName(), fromOrg.getName(),
                "Transfer initiated to " + toOrg.getName());

        var onChainEvent = blockchainClient.recordTransferInitiated(batch);
        onChainEvent.ifPresent(ev -> auditEventService.record(
                batch, com.medchain.audit.AuditEventType.BLOCKCHAIN_RECORDED, "Relayer", "Blockchain",
                "Recorded TRANSFER_INITIATED in block " + ev.getBlockNumber() + " (tx: " + ev.getTxHash() + ")"));

        batchService.refreshRisk(batch);

        return TransferResponse.from(transfer);
    }

    @Transactional
    public TransferResponse receive(String transferId, User currentUser) {
        Transfer transfer = transferRepository.findById(java.util.UUID.fromString(transferId))
                .orElseThrow(() -> new ResourceNotFoundException("No transfer found with id " + transferId));

        if (transfer.getStatus() == TransferStatus.RECEIVED) {
            throw new BadRequestException("This shipment has already been received.");
        }
        if (!transfer.getToOrg().getId().equals(currentUser.getOrganization().getId())) {
            throw new ForbiddenActionException("Only the intended recipient (" + transfer.getToOrg().getName() + ") can confirm receipt.");
        }

        transfer.setStatus(TransferStatus.RECEIVED);
        transfer.setReceivedAt(Instant.now());
        transferRepository.save(transfer);

        MedicineBatch batch = transfer.getBatch();
        batchService.markReceived(batch, transfer.getToOrg());

        auditEventService.record(batch, com.medchain.audit.AuditEventType.TRANSFER_RECEIVED,
                currentUser.getName(), currentUser.getOrganization().getName(),
                "Shipment confirmed and received by " + currentUser.getOrganization().getName());

        var onChainEvent = blockchainClient.recordTransferReceived(batch);
        onChainEvent.ifPresent(ev -> auditEventService.record(
                batch, com.medchain.audit.AuditEventType.BLOCKCHAIN_RECORDED, "Relayer", "Blockchain",
                "Recorded TRANSFER_RECEIVED in block " + ev.getBlockNumber() + " (tx: " + ev.getTxHash() + ")"));

        batchService.refreshRisk(batch);

        return TransferResponse.from(transfer);
    }

    public List<TransferResponse> pendingFor(Organization org) {
        return transferRepository.findAllByToOrgAndStatusOrderByInitiatedAtDesc(org, TransferStatus.INITIATED)
                .stream().map(TransferResponse::from).toList();
    }

    public List<TransferResponse> history() {
        return transferRepository.findAllByStatusOrderByInitiatedAtDesc(TransferStatus.RECEIVED)
                .stream().map(TransferResponse::from).toList();
    }

    public List<TransferResponse> all() {
        return transferRepository.findAllByOrderByInitiatedAtDesc()
                .stream().map(TransferResponse::from).toList();
    }
}
