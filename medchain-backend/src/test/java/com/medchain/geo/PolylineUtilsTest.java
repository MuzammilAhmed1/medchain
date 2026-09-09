package com.medchain.geo;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class PolylineUtilsTest {

    @Test
    void testEncodeAndDecode() {
        List<PolylineUtils.LatLng> points = List.of(
                new PolylineUtils.LatLng(16.2120, 77.3439),
                new PolylineUtils.LatLng(14.5000, 77.5000),
                new PolylineUtils.LatLng(12.8452, 77.6602)
        );

        String encoded = PolylineUtils.encode(points);
        assertThat(encoded).isNotEmpty();

        List<PolylineUtils.LatLng> decoded = PolylineUtils.decode(encoded);
        assertThat(decoded).hasSize(3);
        assertThat(decoded.get(0).latitude()).isCloseTo(16.2120, within(0.0001));
        assertThat(decoded.get(0).longitude()).isCloseTo(77.3439, within(0.0001));
        assertThat(decoded.get(2).latitude()).isCloseTo(12.8452, within(0.0001));
        assertThat(decoded.get(2).longitude()).isCloseTo(77.6602, within(0.0001));
    }

    @Test
    void testHaversineDistance() {
        // Distance between Raichur (16.2120, 77.3439) and Bangalore (12.8452, 77.6602) is ~375-380 km
        double distanceMeters = PolylineUtils.haversineMeters(16.2120, 77.3439, 12.8452, 77.6602);
        double distanceKm = distanceMeters / 1000.0;

        assertThat(distanceKm).isBetween(360.0, 390.0);
    }

    @Test
    void testMinDistanceToPolyline() {
        List<PolylineUtils.LatLng> polyline = List.of(
                new PolylineUtils.LatLng(16.0, 77.0),
                new PolylineUtils.LatLng(15.0, 77.0),
                new PolylineUtils.LatLng(14.0, 77.0)
        );

        // Point directly at (15.0, 77.0) should have ~0 distance
        double distZero = PolylineUtils.minDistanceToPolylineMeters(15.0, 77.0, polyline);
        assertThat(distZero).isLessThan(1.0);

        // Point 0.01 deg away (~1.1 km)
        double distAway = PolylineUtils.minDistanceToPolylineMeters(15.0, 77.01, polyline);
        assertThat(distAway).isBetween(900.0, 1300.0);
    }
}
