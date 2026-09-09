package com.medchain.geo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medchain.tracking.dto.RouteResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class GoogleRoutesService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final Map<String, CachedRoute> routeCache = new ConcurrentHashMap<>();

    @Value("${medchain.routing.google-api-key:${medchain.geocoding.google-api-key:}}")
    private String apiKey;

    @Value("${medchain.routing.minimum-recalculation-seconds:60}")
    private long minRecalculationSeconds;

    @Value("${medchain.routing.minimum-distance-meters:500}")
    private double minDistanceMeters;

    private record CachedRoute(
            RouteResponse response,
            Instant cachedAt,
            double originLat,
            double originLng,
            double destLat,
            double destLng
    ) {}

    public RouteResponse calculateRoute(
            Double originLat, Double originLng,
            Double destLat, Double destLng,
            String originDesc, String destDesc
    ) {
        if (originLat == null || originLng == null || destLat == null || destLng == null) {
            log.debug("Missing coordinates for route calculation: ({},{}) -> ({},{})", originLat, originLng, destLat, destLng);
            return RouteResponse.empty(originDesc, destDesc);
        }

        String cacheKey = String.format("%.4f,%.4f->%.4f,%.4f", originLat, originLng, destLat, destLng);
        CachedRoute cached = routeCache.get(cacheKey);

        if (cached != null) {
            long ageSeconds = java.time.Duration.between(cached.cachedAt(), Instant.now()).getSeconds();
            double movementMeters = PolylineUtils.haversineMeters(originLat, originLng, cached.originLat(), cached.originLng());

            if (ageSeconds < minRecalculationSeconds && movementMeters < minDistanceMeters) {
                log.debug("Using cached route (age: {}s, movement: {}m) for key {}", ageSeconds, (long) movementMeters, cacheKey);
                return cached.response();
            }
        }

        // 1. Check if Google API key is configured
        if (apiKey != null && !apiKey.isBlank()) {
            try {
                RouteResponse googleRoute = callGoogleRoutesApi(originLat, originLng, destLat, destLng, originDesc, destDesc);
                if (googleRoute != null) {
                    routeCache.put(cacheKey, new CachedRoute(googleRoute, Instant.now(), originLat, originLng, destLat, destLng));
                    return googleRoute;
                }
            } catch (Exception e) {
                log.warn("Google Routes API call failed: {}. Trying OSRM...", e.getMessage());
            }
        } else {
            log.debug("Google Maps API key not configured for Routes; trying OSRM highway routing.");
        }

        // 2. Real Road Geometry via OSRM (Open Source Routing Machine)
        try {
            RouteResponse osrmRoute = callOsrmApi(originLat, originLng, destLat, destLng, originDesc, destDesc);
            if (osrmRoute != null) {
                routeCache.put(cacheKey, new CachedRoute(osrmRoute, Instant.now(), originLat, originLng, destLat, destLng));
                return osrmRoute;
            }
        } catch (Exception e) {
            log.warn("OSRM routing failed: {}. Falling back to geometric computation.", e.getMessage());
        }

        // 3. Geometric fallback computation (never crashes or fails)
        RouteResponse fallback = computeFallbackRoute(originLat, originLng, destLat, destLng, originDesc, destDesc);
        routeCache.put(cacheKey, new CachedRoute(fallback, Instant.now(), originLat, originLng, destLat, destLng));
        return fallback;
    }

    private RouteResponse callOsrmApi(
            double originLat, double originLng,
            double destLat, double destLng,
            String originDesc, String destDesc
    ) {
        String url = String.format(java.util.Locale.US,
                "https://router.project-osrm.org/route/v1/driving/%.5f,%.5f;%.5f,%.5f?overview=full&geometries=polyline",
                originLng, originLat, destLng, destLat);

        ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            return null;
        }

        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode routes = root.path("routes");
            if (!routes.isArray() || routes.isEmpty()) {
                return null;
            }

            JsonNode route = routes.get(0);
            double distanceMeters = route.path("distance").asDouble();
            double durationSeconds = route.path("duration").asDouble();
            String encodedPolyline = route.path("geometry").asText("");

            Instant eta = Instant.now().plusSeconds((long) durationSeconds);

            log.info("OSRM real road route computed: distance={:.1f}km, duration={:.1f}h, polyline points={}",
                    distanceMeters / 1000.0, durationSeconds / 3600.0, encodedPolyline.length());

            return new RouteResponse(
                    (long) distanceMeters,
                    distanceMeters / 1000.0,
                    (long) durationSeconds,
                    (long) durationSeconds,
                    0L,
                    encodedPolyline,
                    eta,
                    originDesc,
                    destDesc,
                    "ACTIVE"
            );
        } catch (Exception e) {
            log.warn("Failed to parse OSRM response: {}", e.getMessage());
            return null;
        }
    }

    private RouteResponse callGoogleRoutesApi(
            double originLat, double originLng,
            double destLat, double destLng,
            String originDesc, String destDesc
    ) {
        String url = "https://routes.googleapis.com/directions/v2:computeRoutes";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Goog-Api-Key", apiKey.trim());
        headers.set("X-Goog-FieldMask", "routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline");

        Map<String, Object> requestBody = Map.of(
                "origin", Map.of("location", Map.of("latLng", Map.of("latitude", originLat, "longitude", originLng))),
                "destination", Map.of("location", Map.of("latLng", Map.of("latitude", destLat, "longitude", destLng))),
                "travelMode", "DRIVE",
                "routingPreference", "TRAFFIC_AWARE",
                "computeAlternativeRoutes", false
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            log.warn("Google Routes API returned non-2xx status: {}", response.getStatusCode());
            return null;
        }

        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode routes = root.path("routes");
            if (!routes.isArray() || routes.isEmpty()) {
                log.info("Google Routes API returned no routes");
                return null;
            }

            JsonNode route = routes.get(0);
            long distanceMeters = route.path("distanceMeters").asLong();

            // Duration format: e.g. "14200s"
            String durationStr = route.path("duration").asText("0s");
            long trafficDurationSeconds = parseDurationSeconds(durationStr);

            String staticDurationStr = route.path("staticDuration").asText(durationStr);
            long staticDurationSeconds = parseDurationSeconds(staticDurationStr);

            long trafficDelaySeconds = Math.max(0, trafficDurationSeconds - staticDurationSeconds);

            String encodedPolyline = route.path("polyline").path("encodedPolyline").asText("");
            Instant eta = Instant.now().plusSeconds(trafficDurationSeconds);

            log.info("Google Routes computed: distance={}m, duration={}s, trafficDelay={}s",
                    distanceMeters, trafficDurationSeconds, trafficDelaySeconds);

            return new RouteResponse(
                    distanceMeters,
                    distanceMeters / 1000.0,
                    staticDurationSeconds,
                    trafficDurationSeconds,
                    trafficDelaySeconds,
                    encodedPolyline,
                    eta,
                    originDesc,
                    destDesc,
                    "ACTIVE"
            );
        } catch (Exception e) {
            log.warn("Failed to parse Google Routes API response: {}", e.getMessage());
            return null;
        }
    }

    private RouteResponse computeFallbackRoute(
            double originLat, double originLng,
            double destLat, double destLng,
            String originDesc, String destDesc
    ) {
        double distMeters = PolylineUtils.haversineMeters(originLat, originLng, destLat, destLng);
        double distKm = distMeters / 1000.0;

        // Realistic transit road curvature factor ~ 1.25x straight line
        double roadDistanceMeters = distMeters * 1.25;
        double roadDistanceKm = roadDistanceMeters / 1000.0;

        // Average transit speed: 50 km/h
        long durationSeconds = (long) ((roadDistanceKm / 50.0) * 3600);
        Instant eta = Instant.now().plusSeconds(durationSeconds);

        // Generate multi-point highway corridor polyline
        List<PolylineUtils.LatLng> points = new java.util.ArrayList<>();
        points.add(new PolylineUtils.LatLng(originLat, originLng));

        // Check if Raichur -> Bangalore highway corridor
        if (originLat > 15.5 && destLat < 13.5 && originLng < 78.0 && destLng < 78.0) {
            points.add(new PolylineUtils.LatLng(15.6318, 76.8967)); // Siruguppa
            points.add(new PolylineUtils.LatLng(15.1394, 76.9214)); // Bellary
            points.add(new PolylineUtils.LatLng(14.3132, 76.6508)); // Challakere
            points.add(new PolylineUtils.LatLng(14.2287, 76.3980)); // Chitradurga NH 48
            points.add(new PolylineUtils.LatLng(13.7447, 76.9038)); // Sira
            points.add(new PolylineUtils.LatLng(13.3409, 77.1010)); // Tumkur
            points.add(new PolylineUtils.LatLng(13.0970, 77.3912)); // Nelamangala
        } else {
            for (int i = 1; i < 8; i++) {
                double fraction = i / 8.0;
                double lat = originLat + (destLat - originLat) * fraction;
                double lng = originLng + (destLng - originLng) * fraction;
                points.add(new PolylineUtils.LatLng(lat, lng));
            }
        }
        points.add(new PolylineUtils.LatLng(destLat, destLng));
        String encodedPolyline = PolylineUtils.encode(points);

        return new RouteResponse(
                (long) roadDistanceMeters,
                roadDistanceKm,
                durationSeconds,
                durationSeconds,
                0L,
                encodedPolyline,
                eta,
                originDesc,
                destDesc,
                "FALLBACK"
        );
    }

    private long parseDurationSeconds(String durationStr) {
        if (durationStr == null || durationStr.isBlank()) return 0;
        String clean = durationStr.replace("s", "").trim();
        try {
            return Long.parseLong(clean);
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
