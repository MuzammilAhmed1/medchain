package com.medchain.coldchain;

import com.medchain.batch.MedicineBatch;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cold_chain_alerts", indexes = {
        @Index(name = "idx_cca_batch", columnList = "batch_id"),
        @Index(name = "idx_cca_created", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ColdChainAlert {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false)
    private MedicineBatch batch;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertSeverity severity;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(name = "recorded_temperature", nullable = false)
    private double recordedTemperature;

    @Column(name = "min_permitted", nullable = false)
    private double minPermitted;

    @Column(name = "max_permitted", nullable = false)
    private double maxPermitted;

    @Column(name = "duration_minutes")
    private int durationMinutes;

    @Column(name = "degree_minutes_excursion")
    private double degreeMinutesExcursion;

    @Column(name = "is_resolved", nullable = false)
    @Builder.Default
    private boolean isResolved = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    public enum AlertSeverity {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }
}
