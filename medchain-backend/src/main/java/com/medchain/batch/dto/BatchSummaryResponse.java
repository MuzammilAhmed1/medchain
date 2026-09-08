package com.medchain.batch.dto;

import com.medchain.batch.BatchStatus;
import com.medchain.batch.MedicineBatch;
import com.medchain.batch.RiskLevel;

public record BatchSummaryResponse(
        String id,
        String medicineName,
        String currentOwner,
        int quantity,
        BatchStatus status,
        RiskLevel riskLevel,
        Integer riskScore,
        String riskReason
) {
    public static BatchSummaryResponse from(MedicineBatch batch) {
        return new BatchSummaryResponse(
                batch.getId(),
                batch.getMedicineName(),
                batch.getCurrentOwner().getName(),
                batch.getQuantity(),
                batch.getStatus(),
                batch.getRiskLevel(),
                batch.getRiskScore(),
                batch.getRiskReason()
        );
    }
}
