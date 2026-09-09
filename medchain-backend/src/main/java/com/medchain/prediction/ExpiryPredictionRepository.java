package com.medchain.prediction;

import com.medchain.batch.RiskLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExpiryPredictionRepository extends JpaRepository<ExpiryPredictionRecord, UUID> {
    Optional<ExpiryPredictionRecord> findTopByBatchIdOrderByCreatedAtDesc(String batchId);
    List<ExpiryPredictionRecord> findByRiskLevelInOrderByCreatedAtDesc(List<RiskLevel> riskLevels);
    long countByRiskLevelIn(List<RiskLevel> riskLevels);
}
