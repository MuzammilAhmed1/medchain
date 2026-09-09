package com.medchain.tracking;

import com.medchain.transfer.Transfer;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "tracking_locations",
    indexes = {
        @Index(name = "idx_tl_transfer_recorded", columnList = "transfer_id, recorded_at"),
        @Index(name = "idx_tl_device", columnList = "tracking_device_id"),
        @Index(name = "idx_tl_recorded", columnList = "recorded_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackingLocation {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "transfer_id", nullable = false)
    private Transfer transfer;

    @Column(name = "tracking_device_id", nullable = false)
    private String trackingDeviceId;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt;

    @Column(name = "received_at", nullable = false)
    @Builder.Default
    private Instant receivedAt = Instant.now();

    @Column(name = "speed_kph")
    private Double speedKph;

    @Column(name = "heading_degrees")
    private Double headingDegrees;

    @Column(name = "accuracy_meters")
    private Double accuracyMeters;

    @Column(name = "altitude_meters")
    private Double altitudeMeters;

    @Column(length = 50)
    @Builder.Default
    private String source = "DEVICE";

    @Column(nullable = false)
    @Builder.Default
    private boolean valid = true;
}
