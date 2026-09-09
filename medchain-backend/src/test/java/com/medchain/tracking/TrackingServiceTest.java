package com.medchain.tracking;

import com.medchain.audit.AuditEventService;
import com.medchain.auth.Role;
import com.medchain.auth.User;
import com.medchain.batch.BatchService;
import com.medchain.batch.BatchStatus;
import com.medchain.batch.MedicineBatch;
import com.medchain.common.exception.BadRequestException;
import com.medchain.common.exception.ForbiddenActionException;
import com.medchain.common.exception.ResourceNotFoundException;
import com.medchain.events.SseService;
import com.medchain.geo.GoogleRoutesService;
import com.medchain.notification.NotificationService;
import com.medchain.org.OrgType;
import com.medchain.org.Organization;
import com.medchain.tracking.dto.*;
import com.medchain.transfer.Transfer;
import com.medchain.transfer.TransferRepository;
import com.medchain.transfer.TransferStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrackingServiceTest {

    @Mock
    private TransferRepository transferRepository;
    @Mock
    private TrackingLocationRepository trackingLocationRepository;
    @Mock
    private GoogleRoutesService routesService;
    @Mock
    private SseService sseService;
    @Mock
    private AuditEventService auditEventService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private BatchService batchService;

    @InjectMocks
    private TrackingService trackingService;

    private Organization originOrg;
    private Organization destOrg;
    private Organization thirdOrg;
    private User originUser;
    private User destUser;
    private User unauthorizedUser;
    private MedicineBatch batch;
    private Transfer transfer;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(trackingService, "liveThresholdSeconds", 60L);
        ReflectionTestUtils.setField(trackingService, "staleThresholdSeconds", 300L);
        ReflectionTestUtils.setField(trackingService, "routeDeviationThresholdMeters", 1500.0);
        ReflectionTestUtils.setField(trackingService, "unexpectedStopMinutes", 15L);
        ReflectionTestUtils.setField(trackingService, "impossibleSpeedKph", 160.0);

        originOrg = Organization.builder()
                .id(UUID.randomUUID())
                .name("Raichur Pharma")
                .type(OrgType.MANUFACTURER)
                .latitude(16.212)
                .longitude(77.3439)
                .build();

        destOrg = Organization.builder()
                .id(UUID.randomUUID())
                .name("Bangalore Dist")
                .type(OrgType.DISTRIBUTOR)
                .latitude(12.8452)
                .longitude(77.6602)
                .build();

        thirdOrg = Organization.builder()
                .id(UUID.randomUUID())
                .name("Unrelated Org")
                .type(OrgType.DISTRIBUTOR)
                .build();

        originUser = User.builder().id(UUID.randomUUID()).name("Alice").role(Role.MANUFACTURER).organization(originOrg).build();
        destUser = User.builder().id(UUID.randomUUID()).name("Bob").role(Role.DISTRIBUTOR).organization(destOrg).build();
        unauthorizedUser = User.builder().id(UUID.randomUUID()).name("Eve").role(Role.DISTRIBUTOR).organization(thirdOrg).build();

        batch = MedicineBatch.builder()
                .id("MC-2026-00001")
                .batchNumber("MC-2026-00001")
                .medicineName("Amoxicillin 500mg")
                .manufacturer(originOrg)
                .currentOwner(originOrg)
                .status(BatchStatus.IN_TRANSIT)
                .build();

        transfer = Transfer.builder()
                .id(UUID.randomUUID())
                .shipmentNumber("MC-SHIP-2026-0001")
                .batch(batch)
                .fromOrg(originOrg)
                .toOrg(destOrg)
                .status(TransferStatus.IN_TRANSIT)
                .trackingEnabled(true)
                .trackingDeviceId("DEV-TRUCK-KA36")
                .originLatitude(16.212)
                .originLongitude(77.3439)
                .destinationLatitude(12.8452)
                .destinationLongitude(77.6602)
                .initiatedAt(Instant.now().minus(2, ChronoUnit.HOURS))
                .startedAt(Instant.now().minus(1, ChronoUnit.HOURS))
                .build();
    }

    @Test
    void rejectsIngestionWhenShipmentNotFound() {
        when(transferRepository.findByShipmentNumber("UNKNOWN")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> trackingService.ingestLocation(new IngestLocationRequest(
                "UNKNOWN", "DEV-TRUCK-KA36", 16.0, 77.0, Instant.now(), 50.0, 180.0, 10.0, null, null
        )))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void rejectsIngestionWhenTrackingDisabled() {
        transfer.setTrackingEnabled(false);
        when(transferRepository.findById(transfer.getId())).thenReturn(Optional.of(transfer));

        assertThatThrownBy(() -> trackingService.ingestLocation(new IngestLocationRequest(
                transfer.getId().toString(), "DEV-TRUCK-KA36", 16.0, 77.0, Instant.now(), 50.0, 180.0, 10.0, null, null
        )))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Tracking is disabled");
    }

    @Test
    void rejectsIngestionWhenShipmentNotStarted() {
        transfer.setStatus(TransferStatus.INITIATED);
        when(transferRepository.findById(transfer.getId())).thenReturn(Optional.of(transfer));

        assertThatThrownBy(() -> trackingService.ingestLocation(new IngestLocationRequest(
                transfer.getId().toString(), "DEV-TRUCK-KA36", 16.0, 77.0, Instant.now(), 50.0, 180.0, 10.0, null, null
        )))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Must be IN_TRANSIT");
    }

    @Test
    void rejectsIngestionWhenShipmentAlreadyReceived() {
        transfer.setStatus(TransferStatus.RECEIVED);
        when(transferRepository.findById(transfer.getId())).thenReturn(Optional.of(transfer));

        assertThatThrownBy(() -> trackingService.ingestLocation(new IngestLocationRequest(
                transfer.getId().toString(), "DEV-TRUCK-KA36", 16.0, 77.0, Instant.now(), 50.0, 180.0, 10.0, null, null
        )))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already been received");
    }

    @Test
    void rejectsIngestionWhenWrongDeviceID() {
        when(transferRepository.findById(transfer.getId())).thenReturn(Optional.of(transfer));

        assertThatThrownBy(() -> trackingService.ingestLocation(new IngestLocationRequest(
                transfer.getId().toString(), "WRONG-DEVICE", 16.0, 77.0, Instant.now(), 50.0, 180.0, 10.0, null, null
        )))
                .isInstanceOf(ForbiddenActionException.class)
                .hasMessageContaining("not registered for shipment");
    }

    @Test
    void successfullyIngestsValidGpsLocation() {
        when(transferRepository.findById(transfer.getId())).thenReturn(Optional.of(transfer));
        when(trackingLocationRepository.existsByTransferAndTrackingDeviceIdAndLatitudeAndLongitudeAndRecordedAt(
                any(), any(), any(), any(), any())).thenReturn(false);
        when(trackingLocationRepository.findFirstByTransferOrderByRecordedAtDesc(transfer)).thenReturn(Optional.empty());

        when(trackingLocationRepository.save(any(TrackingLocation.class))).thenAnswer(inv -> {
            TrackingLocation loc = inv.getArgument(0);
            loc.setId(UUID.randomUUID());
            return loc;
        });

        TrackingLocationResponse resp = trackingService.ingestLocation(new IngestLocationRequest(
                transfer.getId().toString(), "DEV-TRUCK-KA36", 15.5, 77.2, Instant.now(), 65.0, 160.0, 8.0, 420.0, "SIMULATOR"
        ));

        assertThat(resp).isNotNull();
        assertThat(resp.latitude()).isEqualTo(15.5);
        assertThat(resp.longitude()).isEqualTo(77.2);
        assertThat(resp.speedKph()).isEqualTo(65.0);
        assertThat(resp.source()).isEqualTo("SIMULATOR");

        verify(trackingLocationRepository).save(any(TrackingLocation.class));
        verify(sseService).broadcast(eq("SHIPMENT_LOCATION_UPDATED"), any());
    }

    @Test
    void rejectsUnauthorizedUserFromQueryingTracking() {
        when(transferRepository.findById(transfer.getId())).thenReturn(Optional.of(transfer));

        assertThatThrownBy(() -> trackingService.getTrackingSummary(transfer.getId().toString(), unauthorizedUser))
                .isInstanceOf(ForbiddenActionException.class)
                .hasMessageContaining("not authorized");
    }

    @Test
    void authorizedDestinationUserCanQueryTrackingSummary() {
        when(transferRepository.findById(transfer.getId())).thenReturn(Optional.of(transfer));

        TrackingLocation latestLoc = TrackingLocation.builder()
                .id(UUID.randomUUID())
                .transfer(transfer)
                .trackingDeviceId("DEV-TRUCK-KA36")
                .latitude(14.5)
                .longitude(77.4)
                .speedKph(55.0)
                .headingDegrees(170.0)
                .recordedAt(Instant.now().minus(20, ChronoUnit.SECONDS))
                .receivedAt(Instant.now().minus(18, ChronoUnit.SECONDS))
                .build();

        when(trackingLocationRepository.findFirstByTransferOrderByRecordedAtDesc(transfer)).thenReturn(Optional.of(latestLoc));
        when(trackingLocationRepository.findAllByTransferOrderByRecordedAtAsc(transfer)).thenReturn(List.of(latestLoc));

        when(routesService.calculateRoute(any(), any(), any(), any(), any(), any())).thenReturn(
                new RouteResponse(250000L, 250.0, 18000L, 18600L, 600L, "poly123", Instant.now().plus(5, ChronoUnit.HOURS), "Current", "Dest", "ACTIVE")
        );

        TrackingSummaryResponse summary = trackingService.getTrackingSummary(transfer.getId().toString(), destUser);

        assertThat(summary).isNotNull();
        assertThat(summary.shipmentNumber()).isEqualTo("MC-SHIP-2026-0001");
        assertThat(summary.trackingStatus()).isEqualTo(TrackingStatus.LIVE);
        assertThat(summary.currentSpeedKph()).isEqualTo(55.0);
        assertThat(summary.currentLocation()).isNotNull();
        assertThat(summary.currentLocation().latitude()).isEqualTo(14.5);
        assertThat(summary.route()).isNotNull();
        assertThat(summary.route().trafficDelaySeconds()).isEqualTo(600L);
    }

    @Test
    void trackingStatusReportsStaleWhenLocationIsOld() {
        when(transferRepository.findById(transfer.getId())).thenReturn(Optional.of(transfer));

        TrackingLocation staleLoc = TrackingLocation.builder()
                .id(UUID.randomUUID())
                .transfer(transfer)
                .trackingDeviceId("DEV-TRUCK-KA36")
                .latitude(14.5)
                .longitude(77.4)
                .speedKph(0.0)
                .recordedAt(Instant.now().minus(120, ChronoUnit.SECONDS)) // 2 minutes old -> stale
                .build();

        when(trackingLocationRepository.findFirstByTransferOrderByRecordedAtDesc(transfer)).thenReturn(Optional.of(staleLoc));
        when(trackingLocationRepository.findAllByTransferOrderByRecordedAtAsc(transfer)).thenReturn(List.of(staleLoc));
        when(routesService.calculateRoute(any(), any(), any(), any(), any(), any())).thenReturn(RouteResponse.empty("A", "B"));

        TrackingSummaryResponse summary = trackingService.getTrackingSummary(transfer.getId().toString(), originUser);

        assertThat(summary.trackingStatus()).isEqualTo(TrackingStatus.STALE);
        assertThat(summary.activeAlerts()).anyMatch(a -> a.contains("GPS signal is stale"));
    }
}
