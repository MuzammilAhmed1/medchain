package com.medchain.coldchain.dto;

import com.medchain.coldchain.ColdChainAlert;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class ColdChainAlertResponse {
    private UUID id;
    private String batchId;
    private String severity;
    private String message;
    private double recordedTemperature;
    private double minPermitted;
    private double maxPermitted;
    private int durationMinutes;
    private double degreeMinutesExcursion;
    private boolean isResolved;
    private Instant createdAt;

    public static ColdChainAlertResponse from(ColdChainAlert a) {
        return ColdChainAlertResponse.builder()
                .id(a.getId())
                .batchId(a.getBatch().getId())
                .severity(a.getSeverity().name())
                .message(a.getMessage())
                .recordedTemperature(a.getRecordedTemperature())
                .minPermitted(a.getMinPermitted())
                .maxPermitted(a.getMaxPermitted())
                .durationMinutes(a.getDurationMinutes())
                .degreeMinutesExcursion(a.getDegreeMinutesExcursion())
                .isResolved(a.isResolved())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
