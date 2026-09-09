package com.medchain.blockchain.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;

@Getter
@Builder
public class BatchCustodyTimelineDto {
    private String batchId;
    private String medicineName;
    private String currentOwner;
    private String status;
    private List<TimelineItemDto> timeline;

    @Getter
    @Builder
    public static class TimelineItemDto {
        private String stage; // "CREATED", "IN_TRANSIT", "RECEIVED", "VERIFIED", "RECALLED"
        private String title;
        private String description;
        private String actor;
        private String txHash;
        private Long blockNumber;
        private Instant timestamp;

        @JsonProperty("isBlockchainConfirmed")
        private boolean isBlockchainConfirmed;
    }
}
