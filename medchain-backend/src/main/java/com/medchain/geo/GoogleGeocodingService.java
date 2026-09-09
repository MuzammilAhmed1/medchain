package com.medchain.geo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class GoogleGeocodingService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, GeocodingResult> cache = new ConcurrentHashMap<>();

    @Value("${medchain.geocoding.google-api-key:}")
    private String apiKey;

    public Optional<GeocodingResult> geocode(String address) {
        if (address == null || address.isBlank()) {
            return Optional.empty();
        }

        String normalized = address.trim().toLowerCase();
        if (cache.containsKey(normalized)) {
            log.debug("Geocoding cache hit for address: {}", address);
            return Optional.of(cache.get(normalized));
        }

        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Google Maps API key not configured (medchain.geocoding.google-api-key); skipping geocoding for address: '{}'", address);
            return Optional.empty();
        }

        try {
            String url = UriComponentsBuilder.fromHttpUrl("https://maps.googleapis.com/maps/api/geocode/json")
                    .queryParam("address", address.trim())
                    .queryParam("key", apiKey.trim())
                    .toUriString();

            String rawJson = restTemplate.getForObject(url, String.class);
            if (rawJson == null || rawJson.isBlank()) {
                log.warn("Empty response from Google Geocoding API for address: {}", address);
                return Optional.empty();
            }

            JsonNode root = objectMapper.readTree(rawJson);
            String status = root.path("status").asText();

            if (!"OK".equalsIgnoreCase(status)) {
                log.warn("Google Geocoding API returned status: {} for address: {}", status, address);
                return Optional.empty();
            }

            JsonNode results = root.path("results");
            if (!results.isArray() || results.isEmpty()) {
                log.info("No geocoding coordinates found for address: {}", address);
                return Optional.empty();
            }

            JsonNode first = results.get(0);
            Double lat = first.path("geometry").path("location").path("lat").asDouble();
            Double lng = first.path("geometry").path("location").path("lng").asDouble();
            String formattedAddress = first.path("formatted_address").asText(null);
            String placeId = first.path("place_id").asText(null);

            GeocodingResult result = new GeocodingResult(lat, lng, formattedAddress, placeId);
            cache.put(normalized, result);
            log.info("Successfully geocoded '{}' -> lat: {}, lng: {}", address, lat, lng);
            return Optional.of(result);

        } catch (Exception e) {
            log.warn("Error calling Google Geocoding API for address '{}': {}", address, e.getMessage());
            return Optional.empty();
        }
    }
}
