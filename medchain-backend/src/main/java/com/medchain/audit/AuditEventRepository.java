package com.medchain.audit;

import com.medchain.batch.MedicineBatch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {
    List<AuditEvent> findAllByBatchOrderByTimestampAsc(MedicineBatch batch);
    List<AuditEvent> findTop10ByOrderByTimestampDesc();
    long countByBatchAndEventType(MedicineBatch batch, AuditEventType eventType);
}
