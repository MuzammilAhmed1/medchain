package com.medchain.prediction.dto;

import com.medchain.prediction.DemandPredictionRecord;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class DemandPredictionResponse {
    private UUID id;
    private String medicineName;
    private int currentStock;
    private int predictedDemand7d;
    private int predictedDemand30d;
    private int predictedDemand90d;
    private int recommendedStock;
    private boolean shortageRisk;
    private boolean overstockRisk;
    private double confidence;
    private int sampleCount;
    private boolean hasSufficientData;
    private String modelType;
    private String explanation;
    private Instant createdAt;

    public static DemandPredictionResponse from(DemandPredictionRecord r) {
        return DemandPredictionResponse.builder()
                .id(r.getId())
                .medicineName(r.getMedicineName())
                .currentStock(r.getCurrentStock())
                .predictedDemand7d(r.getPredictedDemand7d())
                .predictedDemand30d(r.getPredictedDemand30d())
                .predictedDemand90d(r.getPredictedDemand90d())
                .recommendedStock(r.getRecommendedStock())
                .shortageRisk(r.isShortageRisk())
                .overstockRisk(r.isOverstockRisk())
                .confidence(r.getConfidence())
                .sampleCount(r.getSampleCount())
                .hasSufficientData(r.isHasSufficientData())
                .modelType(r.getModelType())
                .explanation(r.getExplanation())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
