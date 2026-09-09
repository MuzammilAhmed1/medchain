package com.medchain.reputation.dto;

import com.medchain.reputation.OrganizationTrustScore;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class OrganizationTrustScoreResponse {
    private UUID id;
    private UUID organizationId;
    private String organizationName;
    private int score;
    private int successfulTransfers;
    private int delayedTransfers;
    private int failedTransfers;
    private int verificationFailures;
    private int coldChainViolations;
    private int recallsCount;
    private double blockchainConsistency;
    private Instant calculatedAt;

    public static OrganizationTrustScoreResponse from(OrganizationTrustScore s) {
        return OrganizationTrustScoreResponse.builder()
                .id(s.getId())
                .organizationId(s.getOrganization().getId())
                .organizationName(s.getOrganization().getName())
                .score(s.getScore())
                .successfulTransfers(s.getSuccessfulTransfers())
                .delayedTransfers(s.getDelayedTransfers())
                .failedTransfers(s.getFailedTransfers())
                .verificationFailures(s.getVerificationFailures())
                .coldChainViolations(s.getColdChainViolations())
                .recallsCount(s.getRecallsCount())
                .blockchainConsistency(s.getBlockchainConsistency())
                .calculatedAt(s.getCalculatedAt())
                .build();
    }
}
