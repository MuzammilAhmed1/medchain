package com.medchain.prediction;

import com.medchain.org.Organization;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "demand_predictions", indexes = {
        @Index(name = "idx_dp_med", columnList = "medicine_name"),
        @Index(name = "idx_dp_org", columnList = "organization_id"),
        @Index(name = "idx_dp_created", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DemandPredictionRecord {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "medicine_name", nullable = false)
    private String medicineName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Column(name = "current_stock", nullable = false)
    private int currentStock;

    @Column(name = "predicted_demand_7d", nullable = false)
    private int predictedDemand7d;

    @Column(name = "predicted_demand_30d", nullable = false)
    private int predictedDemand30d;

    @Column(name = "predicted_demand_90d", nullable = false)
    private int predictedDemand90d;

    @Column(name = "recommended_stock", nullable = false)
    private int recommendedStock;

    @Column(name = "shortage_risk", nullable = false)
    private boolean shortageRisk;

    @Column(name = "overstock_risk", nullable = false)
    private boolean overstockRisk;

    @Column(nullable = false)
    private double confidence;

    @Column(name = "sample_count", nullable = false)
    private int sampleCount;

    @Column(name = "has_sufficient_data", nullable = false)
    private boolean hasSufficientData;

    @Column(name = "model_type", nullable = false)
    private String modelType;

    @Column(length = 1500)
    private String explanation;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
