package com.medchain.coldchain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ColdChainAlertRepository extends JpaRepository<ColdChainAlert, UUID> {
    List<ColdChainAlert> findByBatchIdOrderByCreatedAtDesc(String batchId);
    List<ColdChainAlert> findByIsResolvedFalseOrderByCreatedAtDesc();
    long countByIsResolvedFalse();
    long countByBatchIdAndIsResolvedFalse(String batchId);
}
