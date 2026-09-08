package com.medchain.ai.dto;

import java.time.Instant;

public record TransferRecordDto(String from, String to, Instant initiatedAt, Instant receivedAt) {
}
