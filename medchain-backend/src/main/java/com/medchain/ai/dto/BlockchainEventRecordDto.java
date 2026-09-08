package com.medchain.ai.dto;

import java.time.Instant;

public record BlockchainEventRecordDto(String type, Instant timestamp) {
}
