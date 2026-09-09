package com.medchain.tracking.dto;

import com.medchain.transfer.TransferStatus;
import java.time.Instant;
import java.util.UUID;

public record DriverShipmentInfoResponse(
        UUID transferId,
        String shipmentNumber,
        String batchId,
        String medicineName,
        String fromOrg,
        String toOrg,
        String originAddress,
        String destinationAddress,
        Double originLatitude,
        Double originLongitude,
        Double destinationLatitude,
        Double destinationLongitude,
        TransferStatus status,
        boolean trackingEnabled,
        String trackingDeviceId,
        Instant initiatedAt,
        Instant startedAt,
        Instant receivedAt
) {
}
