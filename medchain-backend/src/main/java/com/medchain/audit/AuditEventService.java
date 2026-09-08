package com.medchain.audit;

import com.medchain.batch.MedicineBatch;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditEventService {

    private final AuditEventRepository auditEventRepository;

    @Transactional
    public AuditEvent record(
            MedicineBatch batch,
            AuditEventType type,
            String performedBy,
            String organization,
            String description
    ) {
        AuditEvent event = AuditEvent.builder()
                .batch(batch)
                .eventType(type)
                .performedBy(performedBy != null ? performedBy : "System")
                .organization(organization != null ? organization : "MedChain")
                .description(description)
                .timestamp(Instant.now())
                .build();
        AuditEvent saved = auditEventRepository.save(event);
        log.info("Audit event recorded: {} for batch {} by {} ({})", type, batch.getId(), performedBy, organization);
        return saved;
    }

    public List<AuditEvent> getTimelineForBatch(MedicineBatch batch) {
        return auditEventRepository.findAllByBatchOrderByTimestampAsc(batch);
    }

    public List<AuditEvent> getRecentActivity() {
        return auditEventRepository.findTop10ByOrderByTimestampDesc();
    }
}
