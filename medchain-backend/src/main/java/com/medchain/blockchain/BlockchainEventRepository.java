package com.medchain.blockchain;

import com.medchain.batch.MedicineBatch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BlockchainEventRepository extends JpaRepository<BlockchainEvent, UUID> {
    List<BlockchainEvent> findAllByBatchOrderByTimestampAsc(MedicineBatch batch);
    org.springframework.data.domain.Page<BlockchainEvent> findAllByOrderByTimestampDesc(org.springframework.data.domain.Pageable pageable);
    List<BlockchainEvent> findTop50ByOrderByTimestampDesc();
}
