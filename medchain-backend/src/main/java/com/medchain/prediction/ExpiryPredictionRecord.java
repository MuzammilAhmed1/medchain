package com.medchain.prediction;

import com.medchain.batch.MedicineBatch;
import com.medchain.batch.RiskLevel;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "expiry_predictions", indexes = {
        @Index(name = "idx_ep_batch", columnList = "batch_id"),
        @Index(name = "idx_ep_created", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpiryPredictionRecord {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false)
    private MedicineBatch batch;

    @Column(name = "current_quantity", nullable = false)
    private int currentQuantity;

    @Column(name = "days_to_expiry", nullable = false)
    private int daysToExpiry;

    @Column(name = "predicted_movement", nullable = false)
    private int predictedMovement;

    @Column(name = "estimated_remaining", nullable = false)
    private int estimatedRemaining;

    @Column(name = "remaining_percentage", nullable = false)
    private double remainingPercentage;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", nullable = false)
    private RiskLevel riskLevel;

    @Column(name = "daily_burn_rate", nullable = false)
    private double dailyBurnRate;

    @Column(length = 1500)
    private String explanation;

    @Column(name = "has_sufficient_data", nullable = false)
    private boolean hasSufficientData;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
