package com.medchain.batch;

import com.medchain.org.Organization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BatchRepository extends JpaRepository<MedicineBatch, String> {
    List<MedicineBatch> findAllByOrderByCreatedAtDesc();
    List<MedicineBatch> findTop5ByOrderByCreatedAtDesc();
    List<MedicineBatch> findAllByCurrentOwnerOrderByCreatedAtDesc(Organization owner);
    List<MedicineBatch> findAllByManufacturerOrCurrentOwnerOrderByCreatedAtDesc(Organization manufacturer, Organization currentOwner);
    List<MedicineBatch> findAllByStatus(BatchStatus status);
    List<MedicineBatch> findAllByRiskLevelInOrderByRiskScoreDesc(List<RiskLevel> riskLevels);
    long countByStatus(BatchStatus status);
    long countByRiskLevel(RiskLevel riskLevel);
    long countByCurrentOwner(Organization owner);
}
