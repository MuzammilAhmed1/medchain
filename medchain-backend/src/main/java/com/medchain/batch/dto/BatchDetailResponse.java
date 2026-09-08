package com.medchain.batch.dto;

import com.medchain.batch.BatchStatus;
import com.medchain.batch.RiskLevel;
import com.medchain.blockchain.dto.BlockchainEventResponse;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record BatchDetailResponse(
        String id,
        String batchNumber,
        String medicineName,
        String manufacturer,
        LocalDate manufacturingDate,
        LocalDate expiryDate,
        int quantity,
        String currentOwner,
        BatchStatus status,
        Integer riskScore,
        RiskLevel riskLevel,
        String riskReason,
        String riskRecommendation,
        Instant createdAt,
        Instant updatedAt,
        List<BlockchainEventResponse> blockchainEvents,
        List<TimelineStepResponse> timeline
) {
}
