package com.medchain.tracking.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record IngestLocationRequest(
        @NotBlank(message = "shipmentId or shipmentNumber is required")
        String shipmentId,

        @NotBlank(message = "trackingDeviceId is required")
        String trackingDeviceId,

        @NotNull(message = "latitude is required")
        @DecimalMin(value = "-90.0", message = "latitude must be >= -90")
        @DecimalMax(value = "90.0", message = "latitude must be <= 90")
        Double latitude,

        @NotNull(message = "longitude is required")
        @DecimalMin(value = "-180.0", message = "longitude must be >= -180")
        @DecimalMax(value = "180.0", message = "longitude must be <= 180")
        Double longitude,

        Instant recordedAt,

        @DecimalMin(value = "0.0", message = "speedKph cannot be negative")
        Double speedKph,

        @DecimalMin(value = "0.0", message = "headingDegrees must be >= 0")
        @DecimalMax(value = "360.0", message = "headingDegrees must be <= 360")
        Double headingDegrees,

        @DecimalMin(value = "0.0", message = "accuracyMeters cannot be negative")
        @DecimalMax(value = "10000.0", message = "accuracyMeters cannot exceed 10000 meters")
        Double accuracyMeters,

        Double altitudeMeters,

        String source
) {
    public Instant effectiveRecordedAt() {
        return recordedAt != null ? recordedAt : Instant.now();
    }
}
