package com.medchain.tracking.dto;

import com.medchain.tracking.TrackingLocation;

import java.time.Instant;
import java.util.UUID;

public record TrackingLocationResponse(
        UUID id,
        UUID transferId,
        String trackingDeviceId,
        Double latitude,
        Double longitude,
        Instant recordedAt,
        Instant receivedAt,
        Double speedKph,
        Double headingDegrees,
        Double accuracyMeters,
        Double altitudeMeters,
        String source,
        boolean valid
) {
    public static TrackingLocationResponse from(TrackingLocation tl) {
        if (tl == null) return null;
        return new TrackingLocationResponse(
                tl.getId(),
                tl.getTransfer().getId(),
                tl.getTrackingDeviceId(),
                tl.getLatitude(),
                tl.getLongitude(),
                tl.getRecordedAt(),
                tl.getReceivedAt(),
                tl.getSpeedKph(),
                tl.getHeadingDegrees(),
                tl.getAccuracyMeters(),
                tl.getAltitudeMeters(),
                tl.getSource(),
                tl.isValid()
        );
    }
}
