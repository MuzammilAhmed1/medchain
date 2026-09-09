package com.medchain.anomaly;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AnomalyEventRepository extends JpaRepository<AnomalyEvent, UUID> {
    @EntityGraph(attributePaths = {"batch", "organization"})
    List<AnomalyEvent> findByBatchIdOrderByCreatedAtDesc(String batchId);

    @EntityGraph(attributePaths = {"batch", "organization"})
    List<AnomalyEvent> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);

    @EntityGraph(attributePaths = {"batch", "organization"})
    Page<AnomalyEvent> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countBySeverityIn(List<AnomalyEvent.AnomalySeverity> severities);
}
