package com.medchain.prediction.dto;

import com.medchain.prediction.ExpiryPredictionRecord;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class ExpiryPredictionResponse {
    private UUID id;
    private String batchId;
    private int currentQuantity;
    private int daysToExpiry;
    private int predictedMovement;
    private int estimatedRemaining;
    private double remainingPercentage;
    private String riskLevel;
    private double dailyBurnRate;
    private String explanation;
    private boolean hasSufficientData;
    private Instant createdAt;

    public static ExpiryPredictionResponse from(ExpiryPredictionRecord r) {
        return ExpiryPredictionResponse.builder()
                .id(r.getId())
                .batchId(r.getBatch().getId())
                .currentQuantity(r.getCurrentQuantity())
                .daysToExpiry(r.getDaysToExpiry())
                .predictedMovement(r.getPredictedMovement())
                .estimatedRemaining(r.getEstimatedRemaining())
                .remainingPercentage(r.getRemainingPercentage())
                .riskLevel(r.getRiskLevel().name())
                .dailyBurnRate(r.getDailyBurnRate())
                .explanation(r.getExplanation())
                .hasSufficientData(r.isHasSufficientData())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
