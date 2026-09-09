package com.medchain.anomaly;

import com.medchain.ai.AiRiskClient;
import com.medchain.ai.dto.AiFraudRequest;
import com.medchain.ai.dto.AiFraudResponse;
import com.medchain.anomaly.dto.AnomalyResponse;
import com.medchain.audit.AuditEventRepository;
import com.medchain.audit.AuditEventType;
import com.medchain.auth.User;
import com.medchain.batch.BatchRepository;
import com.medchain.batch.MedicineBatch;
import com.medchain.common.exception.ResourceNotFoundException;
import com.medchain.events.SseService;
import com.medchain.notification.Notification;
import com.medchain.notification.NotificationService;
import com.medchain.transfer.Transfer;
import com.medchain.transfer.TransferRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnomalyService {

    private final AnomalyEventRepository anomalyRepository;
    private final BatchRepository batchRepository;
    private final TransferRepository transferRepository;
    private final AuditEventRepository auditEventRepository;
    private final AiRiskClient aiRiskClient;
    private final SseService sseService;
    private final NotificationService notificationService;

    @Transactional
    public AnomalyEvent analyzeBatchAnomalies(String batchId) {
        MedicineBatch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("MedicineBatch", "id", batchId));

        List<Transfer> transfers = transferRepository.findAllByBatchOrderByInitiatedAtAsc(batch);
        int hopCount = transfers.size();

        // Calculate average transfer interval hours
        double avgIntervalHours = 0.0;
        if (hopCount > 1) {
            double totalHours = 0.0;
            for (int i = 0; i < transfers.size() - 1; i++) {
                Instant t1 = transfers.get(i).getInitiatedAt();
                Instant t2 = transfers.get(i + 1).getInitiatedAt();
                totalHours += Duration.between(t1, t2).toMinutes() / 60.0;
            }
            avgIntervalHours = totalHours / (hopCount - 1);
        } else if (hopCount == 1 && transfers.get(0).getReceivedAt() != null) {
            avgIntervalHours = Duration.between(transfers.get(0).getInitiatedAt(), transfers.get(0).getReceivedAt()).toMinutes() / 60.0;
        }

        // Circular route detection (org seen more than once in path)
        Set<UUID> seenOrgs = new HashSet<>();
        boolean circularRoute = false;
        for (Transfer t : transfers) {
            if (!seenOrgs.add(t.getFromOrg().getId()) || !seenOrgs.add(t.getToOrg().getId())) {
                circularRoute = true;
                break;
            }
        }

        // Count verification checks on this batch
        int verificationCount = (int) auditEventRepository.countByBatchAndEventType(batch, AuditEventType.QR_VERIFIED);

        // Build historical batch features from other real database batches
        List<MedicineBatch> otherBatches = batchRepository.findAll();
        List<AiFraudRequest.HistoricalBatchFeatureDto> historicalFeatures = otherBatches.stream()
                .filter(b -> !b.getId().equals(batch.getId()))
                .map(b -> {
                    List<Transfer> bTransfers = transferRepository.findAllByBatchOrderByInitiatedAtAsc(b);
                    return AiFraudRequest.HistoricalBatchFeatureDto.builder()
                            .batch_id(b.getId())
                            .hop_count(bTransfers.size())
                            .avg_interval_hours(24.0)
                            .verification_failure_count(0)
                            .qty_delta(0)
                            .build();
                })
                .limit(20)
                .collect(Collectors.toList());

        AiFraudRequest fraudReq = AiFraudRequest.builder()
                .batchId(batch.getId())
                .hopCount(hopCount)
                .avgIntervalHours(avgIntervalHours)
                .verificationFailureCount(0)
                .qtyDelta(0)
                .isRouteSuspicious(circularRoute)
                .historicalBatches(historicalFeatures)
                .build();

        Optional<AiFraudResponse> aiResOpt = aiRiskClient.analyzeFraud(fraudReq);

        int score = 0;
        String reason = "No anomalous supply chain activity detected.";
        AnomalyEvent.AnomalySeverity severity = AnomalyEvent.AnomalySeverity.LOW;
        AnomalyEvent.AnomalyType anomalyType = AnomalyEvent.AnomalyType.ISOLATION_FOREST_OUTLIER;
        double confidence = 0.50;
        String modelVersion = "isolation-forest-v1.0";
        boolean hasSufficientData = false;
        String contributingFactors = "{}";

        if (aiResOpt.isPresent()) {
            AiFraudResponse aiRes = aiResOpt.get();
            score = aiRes.getFraudScore();
            confidence = aiRes.getConfidence();
            modelVersion = aiRes.getModelVersion();
            hasSufficientData = aiRes.isHasSufficientData();
            reason = aiRes.getExplanation();

            if (!aiRes.getDetectedReasons().isEmpty()) {
                reason = String.join("; ", aiRes.getDetectedReasons()) + ". " + aiRes.getExplanation();
            }

            if (aiRes.getContributingFactors() != null) {
                contributingFactors = aiRes.getContributingFactors().toString();
            }

            try {
                severity = AnomalyEvent.AnomalySeverity.valueOf(aiRes.getRiskLevel());
            } catch (Exception e) {
                severity = score >= 70 ? AnomalyEvent.AnomalySeverity.HIGH : AnomalyEvent.AnomalySeverity.MEDIUM;
            }

            if (circularRoute) {
                anomalyType = AnomalyEvent.AnomalyType.SUSPICIOUS_ROUTE;
            } else if (hopCount >= 4) {
                anomalyType = AnomalyEvent.AnomalyType.REPEATED_HOPS;
            } else if (avgIntervalHours > 0 && avgIntervalHours < 1.0) {
                anomalyType = AnomalyEvent.AnomalyType.ABNORMAL_TRANSFER_SPEED;
            }
        }

        AnomalyEvent event = AnomalyEvent.builder()
                .batch(batch)
                .organization(batch.getCurrentOwner())
                .anomalyType(anomalyType)
                .severity(severity)
                .score(score)
                .detectedReason(reason)
                .contributingFactors(contributingFactors)
                .confidence(confidence)
                .modelVersion(modelVersion)
                .hasSufficientData(hasSufficientData)
                .build();

        AnomalyEvent saved = anomalyRepository.save(event);

        if (score >= 50 || severity == AnomalyEvent.AnomalySeverity.HIGH || severity == AnomalyEvent.AnomalySeverity.CRITICAL) {
            sseService.broadcast("ANOMALY_DETECTED", event);

            notificationService.notify(
                    "Supply-Chain Anomaly: " + batch.getId(),
                    reason,
                    Notification.NotificationType.FRAUD_ANOMALY,
                    "BATCH",
                    batch.getId(),
                    null,
                    batch.getCurrentOwner(),
                    null
            );
        }

        return saved;
    }

    @Transactional(readOnly = true)
    public Page<AnomalyResponse> getAnomalies(User user, Pageable pageable) {
        return anomalyRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(AnomalyResponse::from);
    }

    @Transactional(readOnly = true)
    public List<AnomalyResponse> getAnomaliesForBatch(String batchId) {
        return anomalyRepository.findByBatchIdOrderByCreatedAtDesc(batchId).stream()
                .map(AnomalyResponse::from)
                .collect(Collectors.toList());
    }
}
