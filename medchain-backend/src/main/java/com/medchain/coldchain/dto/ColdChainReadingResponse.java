package com.medchain.coldchain.dto;

import com.medchain.coldchain.ColdChainReading;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class ColdChainReadingResponse {
    private UUID id;
    private String batchId;
    private String deviceId;
    private double temperature;
    private Double humidity;
    private String location;
    private Instant recordedAt;
    private Instant createdAt;

    public static ColdChainReadingResponse from(ColdChainReading r) {
        return ColdChainReadingResponse.builder()
                .id(r.getId())
                .batchId(r.getBatch().getId())
                .deviceId(r.getDeviceId())
                .temperature(r.getTemperature())
                .humidity(r.getHumidity())
                .location(r.getLocation())
                .recordedAt(r.getRecordedAt())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
