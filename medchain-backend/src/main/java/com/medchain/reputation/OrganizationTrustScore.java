package com.medchain.reputation;

import com.medchain.org.Organization;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "organization_trust_scores", indexes = {
        @Index(name = "idx_ots_org", columnList = "organization_id"),
        @Index(name = "idx_ots_calc", columnList = "calculated_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrganizationTrustScore {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(nullable = false)
    private int score;

    @Column(name = "successful_transfers", nullable = false)
    private int successfulTransfers;

    @Column(name = "delayed_transfers", nullable = false)
    private int delayedTransfers;

    @Column(name = "failed_transfers", nullable = false)
    private int failedTransfers;

    @Column(name = "verification_failures", nullable = false)
    private int verificationFailures;

    @Column(name = "cold_chain_violations", nullable = false)
    private int coldChainViolations;

    @Column(name = "recalls_count", nullable = false)
    private int recallsCount;

    @Column(name = "blockchain_consistency", nullable = false)
    private double blockchainConsistency;

    @Column(name = "calculated_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant calculatedAt = Instant.now();
}
