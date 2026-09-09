package com.medchain.notification;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class NotificationResponse {
    private UUID id;
    private String title;
    private String message;
    private String notificationType;
    private String referenceType;
    private String referenceId;

    @JsonProperty("isRead")
    private boolean isRead;
    private Instant createdAt;

    public static NotificationResponse from(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .message(n.getMessage())
                .notificationType(n.getNotificationType().name())
                .referenceType(n.getReferenceType())
                .referenceId(n.getReferenceId())
                .isRead(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
