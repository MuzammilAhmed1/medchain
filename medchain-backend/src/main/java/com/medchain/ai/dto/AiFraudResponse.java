package com.medchain.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiFraudResponse {
    private String batchId;
    private int fraudScore;
    private String riskLevel;
    private List<String> detectedReasons;
    private Map<String, Double> contributingFactors;
    private double confidence;
    private String modelVersion;
    private boolean hasSufficientData;
    private int sampleCount;
    private String explanation;
}
