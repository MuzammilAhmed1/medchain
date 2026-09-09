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
public class AiColdChainResponse {
    private String batchId;
    private boolean excursionDetected;
    private int durationMinutes;
    private double maxTemperature;
    private double minTemperature;
    private double fluctuationRate;
    private double degreeMinutesExcursion;
    private String spoilageRisk;
    private String reason;
}
