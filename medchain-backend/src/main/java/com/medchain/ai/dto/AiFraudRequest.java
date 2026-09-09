package com.medchain.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiFraudRequest {
    private String batchId;
    private int hopCount;
    private double avgIntervalHours;
    private int verificationFailureCount;
    private int qtyDelta;
    private boolean isRouteSuspicious;
    private List<HistoricalBatchFeatureDto> historicalBatches;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class HistoricalBatchFeatureDto {
        private String batch_id;
        private int hop_count;
        private double avg_interval_hours;
        private int verification_failure_count;
        private int qty_delta;
    }
}
