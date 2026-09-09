package com.medchain.transfer.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

public record InitiateTransferRequest(
        @NotBlank(message = "batchId is required") String batchId,
        @NotBlank(message = "toOrganizationName is required") String toOrganizationName,
        Instant expectedDeliveryAt,
        Boolean trackingEnabled,
        String trackingDeviceId,
        String originAddress,
        Double originLatitude,
        Double originLongitude,
        String destinationAddress,
        Double destinationLatitude,
        Double destinationLongitude
) {
    public InitiateTransferRequest(String batchId, String toOrganizationName) {
        this(batchId, toOrganizationName, null, true, null, null, null, null, null, null, null);
    }
}

