package com.medchain.prediction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DemandPredictionRepository extends JpaRepository<DemandPredictionRecord, UUID> {
    Optional<DemandPredictionRecord> findTopByMedicineNameOrderByCreatedAtDesc(String medicineName);
    List<DemandPredictionRecord> findByShortageRiskTrueOrderByCreatedAtDesc();
    long countByShortageRiskTrue();
}
