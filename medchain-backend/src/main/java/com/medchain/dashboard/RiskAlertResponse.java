package com.medchain.dashboard;

import com.medchain.batch.MedicineBatch;
import com.medchain.batch.RiskLevel;

public record RiskAlertResponse(String id, String medicineName, Integer riskScore, RiskLevel riskLevel, String riskReason) {
    public static RiskAlertResponse from(MedicineBatch batch) {
        return new RiskAlertResponse(
                batch.getId(), batch.getMedicineName(), batch.getRiskScore(), batch.getRiskLevel(), batch.getRiskReason());
    }
}
