package com.medchain.tracking;

import com.medchain.audit.AuditEventService;
import com.medchain.audit.AuditEventType;
import com.medchain.auth.Role;
import com.medchain.auth.User;
import com.medchain.batch.BatchService;
import com.medchain.common.exception.BadRequestException;
import com.medchain.common.exception.ForbiddenActionException;
import com.medchain.common.exception.ResourceNotFoundException;
import com.medchain.events.SseService;
import com.medchain.geo.GoogleRoutesService;
import com.medchain.geo.PolylineUtils;
import com.medchain.notification.Notification;
import com.medchain.notification.NotificationService;
import com.medchain.tracking.dto.*;
import com.medchain.transfer.Transfer;
import com.medchain.transfer.TransferRepository;
import com.medchain.transfer.TransferStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class TrackingService {

    private final TransferRepository transferRepository;
    private final TrackingLocationRepository trackingLocationRepository;
    private final GoogleRoutesService routesService;
    private final SseService sseService;
    private final AuditEventService auditEventService;
    private final NotificationService notificationService;
    private final BatchService batchService;

    @Value("${medchain.tracking.live-threshold-seconds:60}")
    private long liveThresholdSeconds;

    @Value("${medchain.tracking.stale-threshold-seconds:300}")
    private long staleThresholdSeconds;

    @Value("${medchain.tracking.route-deviation-threshold-meters:1500}")
    private double routeDeviationThresholdMeters;

    @Value("${medchain.tracking.unexpected-stop-minutes:15}")
    private long unexpectedStopMinutes;

    @Value("${medchain.tracking.impossible-speed-kph:160}")
    private double impossibleSpeedKph;

    // Cooldown maps to avoid spamming alerts
    private final Map<UUID, Instant> lastDeviationAlert = new ConcurrentHashMap<>();
    private final Map<UUID, Instant> lastStopAlert = new ConcurrentHashMap<>();

    @Transactional
    public TrackingLocationResponse ingestLocation(IngestLocationRequest request) {
        Transfer transfer = findTransferOrThrow(request.shipmentId());

        if (!transfer.isTrackingEnabled()) {
            throw new BadRequestException("Tracking is disabled for shipment: " + transfer.getShipmentNumber());
        }

        if (transfer.getStatus() == TransferStatus.RECEIVED) {
            throw new BadRequestException("Shipment " + transfer.getShipmentNumber() + " has already been received. Tracking is closed.");
        }

        if (transfer.getStatus() != TransferStatus.IN_TRANSIT) {
            throw new BadRequestException("Shipment " + transfer.getShipmentNumber() + " is currently " + transfer.getStatus() + ". Must be IN_TRANSIT to accept GPS tracking.");
        }

        // Validate Device ID
        if (transfer.getTrackingDeviceId() != null && !transfer.getTrackingDeviceId().isBlank()) {
            if (!transfer.getTrackingDeviceId().trim().equalsIgnoreCase(request.trackingDeviceId().trim())) {
                throw new ForbiddenActionException("Device ID '" + request.trackingDeviceId() + "' is not registered for shipment " + transfer.getShipmentNumber());
            }
        }

        Instant recordedAt = request.effectiveRecordedAt();
        Instant now = Instant.now();
        if (recordedAt.isAfter(now.plus(Duration.ofMinutes(15)))) {
            throw new BadRequestException("Telemetry recordedAt timestamp cannot be in the future: " + recordedAt);
        }
        if (recordedAt.isBefore(now.minus(Duration.ofDays(30)))) {
            throw new BadRequestException("Telemetry recordedAt timestamp is too old (> 30 days): " + recordedAt);
        }

        if (request.accuracyMeters() != null && request.accuracyMeters() > 10000.0) {
            throw new BadRequestException("Accuracy radius " + request.accuracyMeters() + "m exceeds maximum threshold of 10000m");
        }

        // Check deduplication
        if (trackingLocationRepository.existsByTransferAndTrackingDeviceIdAndLatitudeAndLongitudeAndRecordedAt(
                transfer, request.trackingDeviceId().trim(), request.latitude(), request.longitude(), recordedAt)) {
            log.debug("Ignoring duplicate GPS location point for shipment {}", transfer.getShipmentNumber());
            return trackingLocationRepository.findFirstByTransferOrderByRecordedAtDesc(transfer)
                    .map(TrackingLocationResponse::from)
                    .orElse(null);
        }

        Optional<TrackingLocation> prevLocationOpt = trackingLocationRepository.findFirstByTransferOrderByRecordedAtDesc(transfer);

        TrackingLocation location = TrackingLocation.builder()
                .transfer(transfer)
                .trackingDeviceId(request.trackingDeviceId().trim())
                .latitude(request.latitude())
                .longitude(request.longitude())
                .recordedAt(recordedAt)
                .receivedAt(Instant.now())
                .speedKph(request.speedKph())
                .headingDegrees(request.headingDegrees())
                .accuracyMeters(request.accuracyMeters())
                .altitudeMeters(request.altitudeMeters())
                .source(request.source() != null ? request.source() : "DEVICE")
                .valid(true)
                .build();

        location = trackingLocationRepository.save(location);

        // Broadcast SSE event
        Map<String, Object> ssePayload = Map.of(
                "eventType", "SHIPMENT_LOCATION_UPDATED",
                "shipmentId", transfer.getId().toString(),
                "shipmentNumber", transfer.getShipmentNumber(),
                "latitude", location.getLatitude(),
                "longitude", location.getLongitude(),
                "speedKph", location.getSpeedKph() != null ? location.getSpeedKph() : 0.0,
                "headingDegrees", location.getHeadingDegrees() != null ? location.getHeadingDegrees() : 0.0,
                "recordedAt", location.getRecordedAt().toString(),
                "trackingStatus", "LIVE"
        );
        sseService.broadcast("SHIPMENT_LOCATION_UPDATED", ssePayload);

        // Perform anomaly detections asynchronously / non-blocking
        evaluateAnomalies(transfer, location, prevLocationOpt.orElse(null));

        return TrackingLocationResponse.from(location);
    }

    private void evaluateAnomalies(Transfer transfer, TrackingLocation current, TrackingLocation prev) {
        try {
            // 1. Impossible Movement Check
            if (prev != null) {
                double distanceMeters = PolylineUtils.haversineMeters(
                        prev.getLatitude(), prev.getLongitude(),
                        current.getLatitude(), current.getLongitude()
                );
                long seconds = Duration.between(prev.getRecordedAt(), current.getRecordedAt()).abs().getSeconds();
                if (seconds > 0) {
                    double impliedSpeedKph = (distanceMeters / 1000.0) / (seconds / 3600.0);
                    if (impliedSpeedKph > impossibleSpeedKph && distanceMeters > 500) {
                        log.warn("Impossible movement detected for shipment {}: implied speed {} km/h over {} meters in {}s",
                                transfer.getShipmentNumber(), (int) impliedSpeedKph, (int) distanceMeters, seconds);
                        auditEventService.record(transfer.getBatch(), AuditEventType.QR_VERIFIED,
                                "GPS System", "MedChain Tracking",
                                String.format("Telemetry Warning: Implied transit velocity of %d km/h exceeds threshold", (int) impliedSpeedKph));
                    }
                }
            }

            // 2. Route Deviation Check
            if (transfer.getDestinationLatitude() != null && transfer.getDestinationLongitude() != null) {
                RouteResponse plannedRoute = routesService.calculateRoute(
                        transfer.getOriginLatitude(), transfer.getOriginLongitude(),
                        transfer.getDestinationLatitude(), transfer.getDestinationLongitude(),
                        transfer.getFromOrg().getName(), transfer.getToOrg().getName()
                );

                if (plannedRoute != null && plannedRoute.encodedPolyline() != null && !plannedRoute.encodedPolyline().isBlank()) {
                    List<PolylineUtils.LatLng> nodes = PolylineUtils.decode(plannedRoute.encodedPolyline());
                    double devMeters = PolylineUtils.minDistanceToPolylineMeters(current.getLatitude(), current.getLongitude(), nodes);

                    if (devMeters > routeDeviationThresholdMeters) {
                        Instant lastAlert = lastDeviationAlert.get(transfer.getId());
                        if (lastAlert == null || Duration.between(lastAlert, Instant.now()).toMinutes() >= 5) {
                            lastDeviationAlert.put(transfer.getId(), Instant.now());
                            String msg = String.format("Route Deviation Detected: Vehicle is %d meters away from planned path", (int) devMeters);
                            log.warn("Shipment {}: {}", transfer.getShipmentNumber(), msg);

                            auditEventService.record(transfer.getBatch(), AuditEventType.QR_VERIFIED,
                                    "GPS System", "MedChain Tracking", msg);

                            notificationService.notify("Route Deviation",
                                    "Shipment " + transfer.getShipmentNumber() + ": " + msg,
                                    Notification.NotificationType.TRANSFER_EVENT, "SHIPMENT",
                                    transfer.getId().toString(), null, transfer.getToOrg(), null);
                        }
                    }
                }
            }

            // 3. Unexpected Stop Check
            if (current.getSpeedKph() != null && current.getSpeedKph() < 2.0 && prev != null) {
                if (prev.getSpeedKph() != null && prev.getSpeedKph() < 2.0) {
                    long stoppedMinutes = Duration.between(prev.getRecordedAt(), current.getRecordedAt()).toMinutes();
                    if (stoppedMinutes >= unexpectedStopMinutes) {
                        Instant lastAlert = lastStopAlert.get(transfer.getId());
                        if (lastAlert == null || Duration.between(lastAlert, Instant.now()).toMinutes() >= 15) {
                            lastStopAlert.put(transfer.getId(), Instant.now());
                            String msg = String.format("Unexpected Stop Alert: Vehicle stationary for %d minutes", stoppedMinutes);
                            log.warn("Shipment {}: {}", transfer.getShipmentNumber(), msg);

                            auditEventService.record(transfer.getBatch(), AuditEventType.QR_VERIFIED,
                                    "GPS System", "MedChain Tracking", msg);

                            notificationService.notify("Unexpected Stop",
                                    "Shipment " + transfer.getShipmentNumber() + ": " + msg,
                                    Notification.NotificationType.TRANSFER_EVENT, "SHIPMENT",
                                    transfer.getId().toString(), null, transfer.getToOrg(), null);
                        }
                    }
                }
            }

        } catch (Exception e) {
            log.warn("Anomaly evaluation error for shipment {}: {}", transfer.getShipmentNumber(), e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public TrackingLocationResponse getCurrentLocation(String shipmentId, User currentUser) {
        Transfer transfer = findTransferOrThrow(shipmentId);
        assertUserAuthorized(transfer, currentUser);

        return trackingLocationRepository.findFirstByTransferOrderByRecordedAtDesc(transfer)
                .map(TrackingLocationResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("No GPS location records found for shipment: " + transfer.getShipmentNumber()));
    }

    @Transactional(readOnly = true)
    public Page<TrackingLocationResponse> getHistory(String shipmentId, Pageable pageable, User currentUser) {
        Transfer transfer = findTransferOrThrow(shipmentId);
        assertUserAuthorized(transfer, currentUser);

        return trackingLocationRepository.findAllByTransferOrderByRecordedAtDesc(transfer, pageable)
                .map(TrackingLocationResponse::from);
    }

    @Transactional(readOnly = true)
    public List<TrackingLocationResponse> getAllHistoryList(String shipmentId, User currentUser) {
        Transfer transfer = findTransferOrThrow(shipmentId);
        assertUserAuthorized(transfer, currentUser);

        return trackingLocationRepository.findAllByTransferOrderByRecordedAtAsc(transfer).stream()
                .map(TrackingLocationResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public RouteResponse getRoute(String shipmentId, User currentUser) {
        Transfer transfer = findTransferOrThrow(shipmentId);
        assertUserAuthorized(transfer, currentUser);

        Optional<TrackingLocation> latestOpt = trackingLocationRepository.findFirstByTransferOrderByRecordedAtDesc(transfer);

        Double originLat = (latestOpt.isPresent() && transfer.getStatus() == TransferStatus.IN_TRANSIT)
                ? latestOpt.get().getLatitude()
                : transfer.getOriginLatitude();
        Double originLng = (latestOpt.isPresent() && transfer.getStatus() == TransferStatus.IN_TRANSIT)
                ? latestOpt.get().getLongitude()
                : transfer.getOriginLongitude();

        return routesService.calculateRoute(
                originLat, originLng,
                transfer.getDestinationLatitude(), transfer.getDestinationLongitude(),
                transfer.getFromOrg().getName(), transfer.getToOrg().getName()
        );
    }

    @Transactional(readOnly = true)
    public TrackingSummaryResponse getTrackingSummary(String shipmentId, User currentUser) {
        Transfer transfer = findTransferOrThrow(shipmentId);
        assertUserAuthorized(transfer, currentUser);

        Optional<TrackingLocation> latestOpt = trackingLocationRepository.findFirstByTransferOrderByRecordedAtDesc(transfer);
        TrackingLocation latest = latestOpt.orElse(null);

        TrackingStatus status = computeTrackingStatus(transfer, latest);

        Double currentLat = latest != null ? latest.getLatitude() : transfer.getOriginLatitude();
        Double currentLng = latest != null ? latest.getLongitude() : transfer.getOriginLongitude();

        RouteResponse remainingRoute = routesService.calculateRoute(
                currentLat, currentLng,
                transfer.getDestinationLatitude(), transfer.getDestinationLongitude(),
                (latest != null ? "Current Vehicle Position" : transfer.getFromOrg().getName()),
                transfer.getToOrg().getName()
        );

        // Compute distance travelled from GPS trail
        List<TrackingLocation> allPoints = trackingLocationRepository.findAllByTransferOrderByRecordedAtAsc(transfer);
        double distanceTravelledMeters = 0.0;
        for (int i = 1; i < allPoints.size(); i++) {
            distanceTravelledMeters += PolylineUtils.haversineMeters(
                    allPoints.get(i - 1).getLatitude(), allPoints.get(i - 1).getLongitude(),
                    allPoints.get(i).getLatitude(), allPoints.get(i).getLongitude()
            );
        }

        List<String> activeAlerts = new ArrayList<>();
        if (status == TrackingStatus.STALE) {
            activeAlerts.add("GPS signal is stale (last update was more than " + (liveThresholdSeconds / 60) + "m ago)");
        } else if (status == TrackingStatus.OFFLINE && transfer.getStatus() == TransferStatus.IN_TRANSIT) {
            activeAlerts.add("Tracking device is offline");
        }

        return new TrackingSummaryResponse(
                transfer.getId(),
                transfer.getShipmentNumber(),
                transfer.getBatch().getId(),
                transfer.getBatch().getMedicineName(),
                transfer.getFromOrg().getName(),
                transfer.getToOrg().getName(),
                transfer.getOriginAddress(),
                transfer.getDestinationAddress(),
                transfer.getOriginLatitude(),
                transfer.getOriginLongitude(),
                transfer.getDestinationLatitude(),
                transfer.getDestinationLongitude(),
                status,
                transfer.isTrackingEnabled(),
                transfer.getTrackingDeviceId(),
                TrackingLocationResponse.from(latest),
                latest != null ? latest.getRecordedAt() : null,
                latest != null ? latest.getSpeedKph() : null,
                latest != null ? latest.getHeadingDegrees() : null,
                remainingRoute,
                distanceTravelledMeters,
                remainingRoute.distanceMeters() != null ? remainingRoute.distanceMeters().doubleValue() : null,
                remainingRoute.estimatedArrivalAt(),
                remainingRoute.trafficDelaySeconds(),
                activeAlerts
        );
    }

    private TrackingStatus computeTrackingStatus(Transfer transfer, TrackingLocation latest) {
        if (!transfer.isTrackingEnabled()) {
            return TrackingStatus.NOT_CONFIGURED;
        }

        if (latest == null) {
            return TrackingStatus.WAITING_FOR_SIGNAL;
        }

        if (transfer.getStatus() == TransferStatus.RECEIVED) {
            return TrackingStatus.OFFLINE;
        }

        long ageSeconds = Duration.between(latest.getRecordedAt(), Instant.now()).abs().getSeconds();

        if (ageSeconds <= liveThresholdSeconds) {
            return TrackingStatus.LIVE;
        } else if (ageSeconds <= staleThresholdSeconds) {
            return TrackingStatus.STALE;
        } else {
            return TrackingStatus.OFFLINE;
        }
    }

    public DriverShipmentInfoResponse getDriverShipmentInfo(String shipmentNumberOrId) {
        Transfer transfer = findTransferOrThrow(shipmentNumberOrId);
        return new DriverShipmentInfoResponse(
                transfer.getId(),
                transfer.getShipmentNumber(),
                transfer.getBatch().getId(),
                transfer.getBatch().getMedicineName(),
                transfer.getFromOrg().getName(),
                transfer.getToOrg().getName(),
                transfer.getOriginAddress(),
                transfer.getDestinationAddress(),
                transfer.getOriginLatitude(),
                transfer.getOriginLongitude(),
                transfer.getDestinationLatitude(),
                transfer.getDestinationLongitude(),
                transfer.getStatus(),
                transfer.isTrackingEnabled(),
                transfer.getTrackingDeviceId(),
                transfer.getInitiatedAt(),
                transfer.getStartedAt(),
                transfer.getReceivedAt()
        );
    }

    public Transfer findTransferOrThrow(String idOrNumber) {
        try {
            UUID uuid = UUID.fromString(idOrNumber);
            return transferRepository.findById(uuid)
                    .or(() -> transferRepository.findByShipmentNumber(idOrNumber))
                    .orElseThrow(() -> new ResourceNotFoundException("No shipment found with id: " + idOrNumber));
        } catch (IllegalArgumentException e) {
            return transferRepository.findByShipmentNumber(idOrNumber)
                    .orElseThrow(() -> new ResourceNotFoundException("No shipment found with shipment number: " + idOrNumber));
        }
    }

    private void assertUserAuthorized(Transfer transfer, User currentUser) {
        if (currentUser == null) return;
        if (currentUser.getRole() == Role.ADMIN) return;

        UUID userOrgId = currentUser.getOrganization() != null ? currentUser.getOrganization().getId() : null;
        if (userOrgId == null) {
            throw new ForbiddenActionException("User is not associated with any organization.");
        }

        boolean isFrom = transfer.getFromOrg().getId().equals(userOrgId);
        boolean isTo = transfer.getToOrg().getId().equals(userOrgId);

        if (!isFrom && !isTo) {
            throw new ForbiddenActionException("You are not authorized to view tracking data for this shipment.");
        }
    }
}
