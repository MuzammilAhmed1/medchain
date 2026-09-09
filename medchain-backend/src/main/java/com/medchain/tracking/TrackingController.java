package com.medchain.tracking;

import com.medchain.auth.User;
import com.medchain.tracking.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class TrackingController {

    private final TrackingService trackingService;

    /**
     * Ingest GPS location from tracking device / simulator / mobile app.
     * Can be invoked with device token or system authentication.
     */
    @PostMapping("/api/tracking/location")
    public ResponseEntity<TrackingLocationResponse> ingestLocation(
            @Valid @RequestBody IngestLocationRequest request
    ) {
        return ResponseEntity.ok(trackingService.ingestLocation(request));
    }

    /**
     * Public endpoint for driver mobile tracking PWA.
     * Allows driver to view assigned shipment info and verify IN_TRANSIT status.
     */
    @GetMapping("/api/tracking/driver/shipment/{shipmentNumber}")
    public ResponseEntity<DriverShipmentInfoResponse> getDriverShipment(
            @PathVariable String shipmentNumber
    ) {
        return ResponseEntity.ok(trackingService.getDriverShipmentInfo(shipmentNumber));
    }

    /**
     * Get combined tracking summary (current status, ETA, route, metrics).
     */
    @GetMapping("/api/transfers/{id}/tracking")
    public ResponseEntity<TrackingSummaryResponse> getTrackingSummary(
            @PathVariable String id,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(trackingService.getTrackingSummary(id, currentUser));
    }

    /**
     * Get latest single GPS location.
     */
    @GetMapping("/api/transfers/{id}/tracking/current")
    public ResponseEntity<TrackingLocationResponse> getCurrentLocation(
            @PathVariable String id,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(trackingService.getCurrentLocation(id, currentUser));
    }

    /**
     * Get paginated GPS history for shipment.
     */
    @GetMapping("/api/transfers/{id}/tracking/history")
    public ResponseEntity<Page<TrackingLocationResponse>> getHistory(
            @PathVariable String id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @AuthenticationPrincipal User currentUser
    ) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(500, Math.max(1, size)));
        return ResponseEntity.ok(trackingService.getHistory(id, pageable, currentUser));
    }

    /**
     * Get full chronological GPS trail points for polyline rendering.
     */
    @GetMapping("/api/transfers/{id}/tracking/trail")
    public ResponseEntity<List<TrackingLocationResponse>> getTrail(
            @PathVariable String id,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(trackingService.getAllHistoryList(id, currentUser));
    }

    /**
     * Get current remaining / planned Google Route for shipment.
     */
    @GetMapping("/api/transfers/{id}/tracking/route")
    public ResponseEntity<RouteResponse> getRoute(
            @PathVariable String id,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(trackingService.getRoute(id, currentUser));
    }
}
