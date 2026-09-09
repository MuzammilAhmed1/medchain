package com.medchain.coldchain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
public class CreateReadingRequest {

    @NotBlank(message = "Batch ID is required")
    private String batchId;

    @NotBlank(message = "Device ID is required")
    private String deviceId;

    @NotNull(message = "Temperature is required")
    private Double temperature;

    private Double humidity;

    private String location;

    private Instant recordedAt;

    public Instant getRecordedAt() {
        return recordedAt != null ? recordedAt : Instant.now();
    }
}
