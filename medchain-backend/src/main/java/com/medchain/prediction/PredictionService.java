package com.medchain.prediction;

import com.medchain.ai.AiRiskClient;
import com.medchain.ai.dto.*;
import com.medchain.batch.BatchRepository;
import com.medchain.batch.BatchStatus;
import com.medchain.batch.MedicineBatch;
import com.medchain.batch.RiskLevel;
import com.medchain.common.exception.ResourceNotFoundException;
import com.medchain.notification.Notification;
import com.medchain.notification.NotificationService;
import com.medchain.prediction.dto.DemandPredictionResponse;
import com.medchain.prediction.dto.ExpiryPredictionResponse;
import com.medchain.transfer.Transfer;
import com.medchain.transfer.TransferRepository;
import com.medchain.transfer.TransferStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PredictionService {

    private final BatchRepository batchRepository;
    private final TransferRepository transferRepository;
    private final DemandPredictionRepository demandPredictionRepository;
    private final ExpiryPredictionRepository expiryPredictionRepository;
    private final AiRiskClient aiRiskClient;
    private final NotificationService notificationService;

    @Transactional
    public List<DemandPredictionResponse> forecastDemandForAllMedicines() {
        List<MedicineBatch> allBatches = batchRepository.findAll();
        Set<String> medicineNames = allBatches.stream()
                .map(MedicineBatch::getMedicineName)
                .collect(Collectors.toSet());

        List<DemandPredictionResponse> responses = new ArrayList<>();

        for (String medName : medicineNames) {
            List<MedicineBatch> medBatches = allBatches.stream()
                    .filter(b -> b.getMedicineName().equalsIgnoreCase(medName))
                    .collect(Collectors.toList());

            int currentStock = medBatches.stream()
                    .filter(b -> b.getStatus() != BatchStatus.RECALLED)
                    .mapToInt(MedicineBatch::getQuantity)
                    .sum();

            List<AiDemandRequest.HistoricalDemandPointDto> history = new ArrayList<>();
            for (MedicineBatch b : medBatches) {
                history.add(AiDemandRequest.HistoricalDemandPointDto.builder()
                        .timestamp(b.getCreatedAt())
                        .quantity(b.getQuantity())
                        .build());

                List<Transfer> transfers = transferRepository.findAllByBatchOrderByInitiatedAtAsc(b);
                for (Transfer t : transfers) {
                    if (t.getStatus() == TransferStatus.RECEIVED) {
                        history.add(AiDemandRequest.HistoricalDemandPointDto.builder()
                                .timestamp(t.getReceivedAt() != null ? t.getReceivedAt() : t.getInitiatedAt())
                                .quantity(b.getQuantity())
                                .build());
                    }
                }
            }

            AiDemandRequest req = AiDemandRequest.builder()
                    .medicineName(medName)
                    .currentStock(currentStock)
                    .history(history)
                    .build();

            Optional<AiDemandResponse> aiResOpt = aiRiskClient.predictDemand(req);

            DemandPredictionRecord record;
            if (aiResOpt.isPresent()) {
                AiDemandResponse aiRes = aiResOpt.get();
                record = DemandPredictionRecord.builder()
                        .medicineName(medName)
                        .currentStock(currentStock)
                        .predictedDemand7d(aiRes.getPredictedDemand7d())
                        .predictedDemand30d(aiRes.getPredictedDemand30d())
                        .predictedDemand90d(aiRes.getPredictedDemand90d())
                        .recommendedStock(aiRes.getRecommendedStock())
                        .shortageRisk(aiRes.isShortageRisk())
                        .overstockRisk(aiRes.isOverstockRisk())
                        .confidence(aiRes.getConfidence())
                        .sampleCount(aiRes.getSampleCount())
                        .hasSufficientData(aiRes.isHasSufficientData())
                        .modelType(aiRes.getModelType())
                        .explanation(aiRes.getExplanation())
                        .build();

                if (aiRes.isShortageRisk()) {
                    notificationService.notify(
                            "Medicine Shortage Risk: " + medName,
                            String.format("Current inventory (%d) is below predicted 30-day demand (%d units).",
                                    currentStock, aiRes.getPredictedDemand30d()),
                            Notification.NotificationType.PREDICTED_SHORTAGE,
                            "MEDICINE",
                            medName,
                            null,
                            null,
                            null
                    );
                }
            } else {
                record = DemandPredictionRecord.builder()
                        .medicineName(medName)
                        .currentStock(currentStock)
                        .predictedDemand7d(0)
                        .predictedDemand30d(0)
                        .predictedDemand90d(0)
                        .recommendedStock(currentStock)
                        .shortageRisk(false)
                        .overstockRisk(false)
                        .confidence(0.0)
                        .sampleCount(history.size())
                        .hasSufficientData(false)
                        .modelType("linear-trend-v1.0")
                        .explanation("AI service currently unavailable for demand calculation.")
                        .build();
            }

            DemandPredictionRecord saved = demandPredictionRepository.save(record);
            responses.add(DemandPredictionResponse.from(saved));
        }

        return responses;
    }

    @Transactional
    public ExpiryPredictionResponse predictBatchExpiry(String batchId) {
        MedicineBatch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("MedicineBatch", "id", batchId));

        List<Transfer> transfers = transferRepository.findAllByBatchOrderByInitiatedAtAsc(batch);
        int totalUnitsMoved = (int) transfers.stream()
                .filter(t -> t.getStatus() == TransferStatus.RECEIVED)
                .count() * batch.getQuantity();

        long daysInCirculation = Math.max(1, Duration.between(batch.getCreatedAt(), Instant.now()).toDays());

        Instant expiryInstant = batch.getExpiryDate().atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant mfgInstant = batch.getManufacturingDate().atStartOfDay().toInstant(ZoneOffset.UTC);

        AiExpiryRequest req = AiExpiryRequest.builder()
                .batchId(batch.getId())
                .currentQuantity(batch.getQuantity())
                .manufacturingDate(mfgInstant)
                .expiryDate(expiryInstant)
                .totalUnitsMoved(totalUnitsMoved)
                .daysInCirculation((int) daysInCirculation)
                .build();

        Optional<AiExpiryResponse> aiResOpt = aiRiskClient.predictExpiry(req);

        ExpiryPredictionRecord record;
        if (aiResOpt.isPresent()) {
            AiExpiryResponse aiRes = aiResOpt.get();
            RiskLevel rl = RiskLevel.LOW;
            try {
                rl = RiskLevel.valueOf(aiRes.getRiskLevel());
            } catch (Exception ignored) {}

            record = ExpiryPredictionRecord.builder()
                    .batch(batch)
                    .currentQuantity(batch.getQuantity())
                    .daysToExpiry(aiRes.getDaysToExpiry())
                    .predictedMovement(aiRes.getPredictedMovementBeforeExpiry())
                    .estimatedRemaining(aiRes.getEstimatedRemainingQuantity())
                    .remainingPercentage(aiRes.getRemainingPercentage())
                    .riskLevel(rl)
                    .dailyBurnRate(aiRes.getDailyBurnRate())
                    .explanation(aiRes.getExplanation())
                    .hasSufficientData(aiRes.isHasSufficientData())
                    .build();

            if (rl == RiskLevel.HIGH) {
                notificationService.notify(
                        "Expiry Risk Alert: " + batch.getId(),
                        aiRes.getExplanation(),
                        Notification.NotificationType.EXPIRY_WARNING,
                        "BATCH",
                        batch.getId(),
                        null,
                        batch.getCurrentOwner(),
                        null
                );
            }
        } else {
            long daysToExpiry = Math.max(0, Duration.between(Instant.now(), expiryInstant).toDays());
            record = ExpiryPredictionRecord.builder()
                    .batch(batch)
                    .currentQuantity(batch.getQuantity())
                    .daysToExpiry((int) daysToExpiry)
                    .predictedMovement(0)
                    .estimatedRemaining(batch.getQuantity())
                    .remainingPercentage(100.0)
                    .riskLevel(daysToExpiry <= 60 ? RiskLevel.HIGH : RiskLevel.LOW)
                    .dailyBurnRate(0.0)
                    .explanation("Calculated from calendar shelf-life remaining (AI service unavailable).")
                    .hasSufficientData(false)
                    .build();
        }

        ExpiryPredictionRecord saved = expiryPredictionRepository.save(record);
        return ExpiryPredictionResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<DemandPredictionResponse> getLatestDemandPredictions() {
        return demandPredictionRepository.findAll().stream()
                .map(DemandPredictionResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ExpiryPredictionResponse> getHighExpiryRiskBatches() {
        return expiryPredictionRepository.findByRiskLevelInOrderByCreatedAtDesc(List.of(RiskLevel.HIGH)).stream()
                .map(ExpiryPredictionResponse::from)
                .collect(Collectors.toList());
    }
}
