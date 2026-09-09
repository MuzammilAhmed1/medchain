package com.medchain.tracking.dto;

import java.time.Instant;

public record RouteResponse(
        Long distanceMeters,
        Double distanceKm,
        Long staticDurationSeconds,
        Long trafficDurationSeconds,
        Long trafficDelaySeconds,
        String encodedPolyline,
        Instant estimatedArrivalAt,
        String origin,
        String destination,
        String routeStatus
) {
    public static RouteResponse empty(String origin, String destination) {
        return new RouteResponse(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                origin,
                destination,
                "UNAVAILABLE"
        );
    }
}
