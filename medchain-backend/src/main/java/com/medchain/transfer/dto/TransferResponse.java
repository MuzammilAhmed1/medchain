package com.medchain.transfer.dto;

import com.medchain.transfer.Transfer;
import com.medchain.transfer.TransferStatus;

import java.time.Instant;

public record TransferResponse(
        String id,
        String shipmentNumber,
        String batchId,
        String medicineName,
        String from,
        String to,
        String fromOrgId,
        String toOrgId,
        TransferStatus status,
        String originAddress,
        String destinationAddress,
        Double originLatitude,
        Double originLongitude,
        Double destinationLatitude,
        Double destinationLongitude,
        Instant initiatedAt,
        Instant startedAt,
        Instant receivedAt,
        Instant expectedDeliveryAt,
        boolean trackingEnabled,
        String trackingDeviceId
) {
    public static TransferResponse from(Transfer t) {
        return new TransferResponse(
                t.getId().toString(),
                t.getShipmentNumber(),
                t.getBatch().getId(),
                t.getBatch().getMedicineName(),
                t.getFromOrg().getName(),
                t.getToOrg().getName(),
                t.getFromOrg().getId().toString(),
                t.getToOrg().getId().toString(),
                t.getStatus(),
                t.getOriginAddress(),
                t.getDestinationAddress(),
                t.getOriginLatitude(),
                t.getOriginLongitude(),
                t.getDestinationLatitude(),
                t.getDestinationLongitude(),
                t.getInitiatedAt(),
                t.getStartedAt(),
                t.getReceivedAt(),
                t.getExpectedDeliveryAt(),
                t.isTrackingEnabled(),
                t.getTrackingDeviceId()
        );
    }
}
