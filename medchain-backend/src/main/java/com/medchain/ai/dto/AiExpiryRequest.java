package com.medchain.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiExpiryRequest {
    private String batchId;
    private int currentQuantity;
    private Instant manufacturingDate;
    private Instant expiryDate;
    private int totalUnitsMoved;
    private int daysInCirculation;
}
