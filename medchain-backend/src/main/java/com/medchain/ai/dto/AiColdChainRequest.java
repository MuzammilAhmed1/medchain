package com.medchain.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiColdChainRequest {
    private String batchId;
    private double minPermitted;
    private double maxPermitted;
    private List<ColdChainSensorPointDto> readings;
}
