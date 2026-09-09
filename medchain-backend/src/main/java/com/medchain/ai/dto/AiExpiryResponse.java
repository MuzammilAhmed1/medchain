package com.medchain.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiExpiryResponse {
    private String batchId;
    private int currentQuantity;
    private int daysToExpiry;
    private int predictedMovementBeforeExpiry;
    private int estimatedRemainingQuantity;
    private double remainingPercentage;
    private String riskLevel;
    private String explanation;
    private boolean hasSufficientData;
    private double dailyBurnRate;
}
