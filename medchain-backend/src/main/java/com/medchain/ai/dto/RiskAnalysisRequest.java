package com.medchain.ai.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Mirrors the AI service's BatchRiskRequest pydantic model exactly
 * (see medchain-ai-service/app/models.py) - field names must match since
 * both sides use their framework's default camelCase-preserving JSON
 * binding for these aliases.
 */
public record RiskAnalysisRequest(
        String batchId,
        String status,
        LocalDate manufacturingDate,
        LocalDate expiryDate,
        List<TransferRecordDto> transfers,
        List<BlockchainEventRecordDto> blockchainEvents,
        Instant asOf
) {
}
