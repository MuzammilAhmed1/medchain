package com.medchain.geo;

import com.medchain.tracking.dto.RouteResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class GoogleRoutesServiceTest {

    private GoogleRoutesService routesService;

    @BeforeEach
    void setUp() {
        routesService = new GoogleRoutesService();
        ReflectionTestUtils.setField(routesService, "minRecalculationSeconds", 60L);
        ReflectionTestUtils.setField(routesService, "minDistanceMeters", 500.0);
    }

    @Test
    void returnsEmptyRouteWhenCoordinatesAreMissing() {
        RouteResponse route = routesService.calculateRoute(null, null, 12.8, 77.6, "Origin", "Dest");
        assertThat(route.routeStatus()).isEqualTo("UNAVAILABLE");
        assertThat(route.distanceMeters()).isNull();
    }

    @Test
    void computesFallbackRouteWhenNoApiKeyConfigured() {
        ReflectionTestUtils.setField(routesService, "apiKey", "");

        RouteResponse route = routesService.calculateRoute(16.2120, 77.3439, 12.8452, 77.6602, "Raichur", "Bangalore");

        assertThat(route).isNotNull();
        assertThat(route.routeStatus()).isIn("ACTIVE", "FALLBACK");
        assertThat(route.distanceMeters()).isGreaterThan(350000L);
        assertThat(route.encodedPolyline()).isNotEmpty();
        assertThat(route.estimatedArrivalAt()).isNotNull();
    }

    @Test
    void cachesRecentRouteCalculations() {
        ReflectionTestUtils.setField(routesService, "apiKey", "");

        RouteResponse first = routesService.calculateRoute(16.2120, 77.3439, 12.8452, 77.6602, "Raichur", "Bangalore");
        RouteResponse second = routesService.calculateRoute(16.2120, 77.3439, 12.8452, 77.6602, "Raichur", "Bangalore");

        // Should return identical cached instance
        assertThat(second).isSameAs(first);
    }
}
