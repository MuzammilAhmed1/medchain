package com.medchain.geo;

public record GeocodingResult(
        Double latitude,
        Double longitude,
        String formattedAddress,
        String placeId
) {
}
