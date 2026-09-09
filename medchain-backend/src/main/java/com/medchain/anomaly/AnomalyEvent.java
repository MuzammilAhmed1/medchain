package com.medchain.anomaly;

import com.medchain.batch.MedicineBatch;
import com.medchain.org.Organization;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "anomaly_events", indexes = {
        @Index(name = "idx_ae_batch", columnList = "batch_id"),
        @Index(name = "idx_ae_org", columnList = "organization_id"),
        @Index(name = "idx_ae_created", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnomalyEvent {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id")
    private MedicineBatch batch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Enumerated(EnumType.STRING)
    @Column(name = "anomaly_type", nullable = false)
    private AnomalyType anomalyType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AnomalySeverity severity;

    @Column(nullable = false)
    private int score;

    @Column(name = "detected_reason", nullable = false, length = 1500)
    private String detectedReason;

    @Column(name = "contributing_factors", length = 2000)
    private String contributingFactors;

    @Column(nullable = false)
    private double confidence;

    @Column(name = "model_version", nullable = false)
    private String modelVersion;

    @Column(name = "has_sufficient_data", nullable = false)
    @Builder.Default
    private boolean hasSufficientData = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    public enum AnomalyType {
        SUSPICIOUS_ROUTE,
        ABNORMAL_TRANSFER_SPEED,
        REPEATED_HOPS,
        QUANTITY_MISMATCH,
        VERIFICATION_BURST,
        COLD_CHAIN_EXCURSION,
        BLOCKCHAIN_INCONSISTENCY,
        ISOLATION_FOREST_OUTLIER
    }

    public enum AnomalySeverity {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }
}
