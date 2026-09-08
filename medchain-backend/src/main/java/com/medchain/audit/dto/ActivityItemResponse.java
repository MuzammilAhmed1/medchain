package com.medchain.audit.dto;

import com.medchain.audit.AuditEvent;
import com.medchain.audit.AuditEventType;

import java.time.Instant;

public record ActivityItemResponse(
        String id,
        String batchId,
        String medicineName,
        AuditEventType eventType,
        String performedBy,
        String organization,
        Instant timestamp,
        String description
) {
    public static ActivityItemResponse from(AuditEvent event) {
        return new ActivityItemResponse(
                event.getId().toString(),
                event.getBatch().getId(),
                event.getBatch().getMedicineName(),
                event.getEventType(),
                event.getPerformedBy(),
                event.getOrganization(),
                event.getTimestamp(),
                event.getDescription()
        );
    }
}
