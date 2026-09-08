package com.medchain.blockchain.dto;

import com.medchain.blockchain.BlockchainEvent;
import com.medchain.blockchain.BlockchainEventType;

import java.time.Instant;

public record BlockchainEventResponse(
        BlockchainEventType type,
        String txHash,
        long block,
        Instant timestamp
) {
    public static BlockchainEventResponse from(BlockchainEvent event) {
        return new BlockchainEventResponse(
                event.getType(), event.getTxHash(), event.getBlockNumber(), event.getTimestamp());
    }
}
