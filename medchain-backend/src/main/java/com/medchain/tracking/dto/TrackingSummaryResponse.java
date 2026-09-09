package com.medchain.tracking.dto;

import com.medchain.tracking.TrackingStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TrackingSummaryResponse(
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
        TrackingStatus trackingStatus,
        boolean trackingEnabled,
        String trackingDeviceId,
        TrackingLocationResponse currentLocation,
        Instant lastRecordedAt,
        Double currentSpeedKph,
        Double headingDegrees,
        RouteResponse route,
        Double distanceTravelledMeters,
        Double distanceRemainingMeters,
        Instant estimatedArrivalAt,
        Long trafficDelaySeconds,
        List<String> activeAlerts
) {
}
