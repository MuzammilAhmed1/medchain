package com.medchain.batch;

import com.medchain.org.Organization;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

/**
 * The batch ID (e.g. "MC-2026-00125") is the primary key and doubles as
 * the QR code payload, matching the format used across the sitemap.
 */
@Entity
@Table(name = "medicine_batches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicineBatch {

    @Id
    private String id;

    @Column(name = "medicine_name", nullable = false)
    private String medicineName;

    @ManyToOne(optional = false)
    @JoinColumn(name = "manufacturer_id", nullable = false)
    private Organization manufacturer;

    @Column(name = "manufacturing_date", nullable = false)
    private LocalDate manufacturingDate;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Column(nullable = false)
    private int quantity;

    @ManyToOne(optional = false)
    @JoinColumn(name = "current_owner_id", nullable = false)
    private Organization currentOwner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BatchStatus status = BatchStatus.CREATED;

    // --- AI risk analysis, cached from the last call to the AI service ---
    @Column(name = "risk_score")
    private Integer riskScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level")
    private RiskLevel riskLevel;

    @Column(name = "risk_reason", length = 1000)
    private String riskReason;

    @Column(name = "risk_recommendation", length = 1000)
    private String riskRecommendation;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
