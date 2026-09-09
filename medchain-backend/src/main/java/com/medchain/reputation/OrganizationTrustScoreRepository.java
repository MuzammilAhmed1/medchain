package com.medchain.reputation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationTrustScoreRepository extends JpaRepository<OrganizationTrustScore, UUID> {
    Optional<OrganizationTrustScore> findTopByOrganizationIdOrderByCalculatedAtDesc(UUID organizationId);
    List<OrganizationTrustScore> findByOrderByCalculatedAtDesc();
}
