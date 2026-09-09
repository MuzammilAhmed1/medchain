package com.medchain.blockchain.dto;

import com.medchain.blockchain.BlockchainEvent;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class BlockchainExplorerEventDto {
    private UUID id;
    private String batchId;
    private String medicineName;
    private String eventType;
    private String txHash;
    private long blockNumber;
    private Instant timestamp;
    private String fromAddress;
    private String toAddress;
    private String status;

    public static BlockchainExplorerEventDto from(BlockchainEvent e) {
        return BlockchainExplorerEventDto.builder()
                .id(e.getId())
                .batchId(e.getBatch().getId())
                .medicineName(e.getBatch().getMedicineName())
                .eventType(e.getType().name())
                .txHash(e.getTxHash())
                .blockNumber(e.getBlockNumber())
                .timestamp(e.getTimestamp())
                .fromAddress("0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
                .toAddress("0x5FbDB2315678afecb367f032d93F642f64180aa3")
                .status("CONFIRMED")
                .build();
    }
}
