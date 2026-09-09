package com.medchain.coldchain;

import com.medchain.batch.MedicineBatch;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cold_chain_readings", indexes = {
        @Index(name = "idx_cc_batch_recorded", columnList = "batch_id, recorded_at"),
        @Index(name = "idx_cc_device", columnList = "device_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ColdChainReading {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false)
    private MedicineBatch batch;

    @Column(name = "device_id", nullable = false)
    private String deviceId;

    @Column(nullable = false)
    private double temperature;

    @Column
    private Double humidity;

    @Column
    private String location;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
