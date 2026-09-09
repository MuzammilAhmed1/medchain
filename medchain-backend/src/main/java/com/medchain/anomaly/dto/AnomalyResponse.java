package com.medchain.anomaly.dto;

import com.medchain.anomaly.AnomalyEvent;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class AnomalyResponse {
    private UUID id;
    private String batchId;
    private UUID organizationId;
    private String organizationName;
    private String anomalyType;
    private String severity;
    private int score;
    private String detectedReason;
    private String contributingFactors;
    private double confidence;
    private String modelVersion;
    private boolean hasSufficientData;
    private Instant createdAt;

    public static AnomalyResponse from(AnomalyEvent e) {
        if (e == null) return null;
        String batchId = null;
        if (e.getBatch() != null) {
            try {
                batchId = e.getBatch().getId();
            } catch (Exception ignored) {}
        }
        UUID orgId = null;
        String orgName = null;
        if (e.getOrganization() != null) {
            try {
                orgId = e.getOrganization().getId();
                orgName = e.getOrganization().getName();
            } catch (Exception ignored) {}
        }

        return AnomalyResponse.builder()
                .id(e.getId())
                .batchId(batchId)
                .organizationId(orgId)
                .organizationName(orgName)
                .anomalyType(e.getAnomalyType() != null ? e.getAnomalyType().name() : "ISOLATION_FOREST_OUTLIER")
                .severity(e.getSeverity() != null ? e.getSeverity().name() : "LOW")
                .score(e.getScore())
                .detectedReason(e.getDetectedReason())
                .contributingFactors(e.getContributingFactors())
                .confidence(e.getConfidence())
                .modelVersion(e.getModelVersion() != null ? e.getModelVersion() : "v1.0")
                .hasSufficientData(e.isHasSufficientData())
                .createdAt(e.getCreatedAt())
                .build();
    }
}
