package com.medchain.transfer;

import com.medchain.batch.MedicineBatch;
import com.medchain.org.Organization;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "transfers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transfer {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "batch_id", nullable = false)
    private MedicineBatch batch;

    @ManyToOne(optional = false)
    @JoinColumn(name = "from_org_id", nullable = false)
    private Organization fromOrg;

    @ManyToOne(optional = false)
    @JoinColumn(name = "to_org_id", nullable = false)
    private Organization toOrg;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TransferStatus status = TransferStatus.INITIATED;

    @Column(name = "initiated_at", nullable = false)
    @Builder.Default
    private Instant initiatedAt = Instant.now();

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "received_at")
    private Instant receivedAt;

    @Column(name = "expected_delivery_at")
    private Instant expectedDeliveryAt;

    @Column(name = "shipment_number", unique = true)
    private String shipmentNumber;

    @Column(name = "origin_address", length = 500)
    private String originAddress;

    @Column(name = "destination_address", length = 500)
    private String destinationAddress;

    @Column(name = "origin_latitude")
    private Double originLatitude;

    @Column(name = "origin_longitude")
    private Double originLongitude;

    @Column(name = "destination_latitude")
    private Double destinationLatitude;

    @Column(name = "destination_longitude")
    private Double destinationLongitude;

    @Column(name = "tracking_enabled")
    @Builder.Default
    private boolean trackingEnabled = true;

    @Column(name = "tracking_device_id")
    private String trackingDeviceId;
}
