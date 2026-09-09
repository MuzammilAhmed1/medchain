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
public class AiDemandResponse {
    private String medicineName;
    private int currentStock;
    private int predictedDemand7d;
    private int predictedDemand30d;
    private int predictedDemand90d;
    private int recommendedStock;
    private boolean shortageRisk;
    private boolean overstockRisk;
    private double confidence;
    private String modelType;
    private int sampleCount;
    private boolean hasSufficientData;
    private String explanation;
}
