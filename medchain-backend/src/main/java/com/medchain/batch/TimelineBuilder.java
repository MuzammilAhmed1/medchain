package com.medchain.batch;

import com.medchain.batch.dto.TimelineStepResponse;
import com.medchain.blockchain.BlockchainEvent;
import com.medchain.blockchain.BlockchainEventType;
import com.medchain.transfer.Transfer;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Builds the step-by-step chain-of-custody timeline shown on the batch
 * details page, from the batch's transfer history and blockchain event
 * log. Kept as a plain, dependency-free utility so it stays easy to unit
 * test in isolation from Spring/JPA.
 */
public final class TimelineBuilder {

    private static final DateTimeFormatter TIMESTAMP_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneOffset.UTC);

    private TimelineBuilder() {
    }

    public static List<TimelineStepResponse> buildFromAuditEvents(
            MedicineBatch batch, List<com.medchain.audit.AuditEvent> auditEvents
    ) {
        if (auditEvents == null || auditEvents.isEmpty()) {
            return List.of(TimelineStepResponse.done(
                    "Batch created",
                    batch.getCreatedAt() != null ? TIMESTAMP_FORMAT.format(batch.getCreatedAt()) : null,
                    "Created by " + batch.getManufacturer().getName()
            ));
        }
        List<TimelineStepResponse> steps = new ArrayList<>();
        for (com.medchain.audit.AuditEvent ae : auditEvents) {
            String title = switch (ae.getEventType()) {
                case BATCH_CREATED -> "Batch created";
                case TRANSFER_INITIATED -> "Transfer initiated";
                case TRANSFER_IN_TRANSIT -> "In transit";
                case TRANSFER_RECEIVED -> "Received by " + ae.getOrganization();
                case QR_VERIFIED -> "Verified";
                case BLOCKCHAIN_RECORDED -> "Recorded on blockchain";
                case RECALL_CREATED -> "Batch recalled";
            };
            steps.add(TimelineStepResponse.done(
                title,
                TIMESTAMP_FORMAT.format(ae.getTimestamp()),
                ae.getDescription() != null ? ae.getDescription() : (ae.getPerformedBy() + " · " + ae.getOrganization())
            ));
        }
        if (batch.getStatus() == BatchStatus.IN_TRANSIT) {
            steps.add(TimelineStepResponse.current("In transit", "Awaiting recipient confirmation"));
        }
        return steps;
    }

    public static List<TimelineStepResponse> build(
            MedicineBatch batch, List<Transfer> transfers, List<BlockchainEvent> blockchainEvents
    ) {
        List<TimelineStepResponse> steps = new ArrayList<>();

        steps.add(TimelineStepResponse.done(
                "Batch created",
                formatTimestamp(firstEventTime(blockchainEvents, BlockchainEventType.BATCH_CREATED)
                        .orElse(batch.getCreatedAt())),
                "Created by " + batch.getManufacturer().getName()
        ));

        for (Transfer transfer : transfers) {
            steps.add(TimelineStepResponse.done(
                    "Sent to " + transfer.getToOrg().getName(),
                    formatTimestamp(transfer.getInitiatedAt()),
                    null
            ));

            if (transfer.getReceivedAt() != null) {
                steps.add(TimelineStepResponse.done(
                        "Received by " + transfer.getToOrg().getName(),
                        formatTimestamp(transfer.getReceivedAt()),
                        null
                ));
            } else {
                steps.add(TimelineStepResponse.current(
                        "Received by " + transfer.getToOrg().getName(), null));
            }
        }

        if (transfers.isEmpty() && batch.getStatus() == BatchStatus.CREATED) {
            steps.add(TimelineStepResponse.pending("Sent to distributor"));
        }

        if (batch.getStatus() == BatchStatus.VERIFIED) {
            steps.add(TimelineStepResponse.done(
                    "Verified",
                    formatTimestamp(lastEventTime(blockchainEvents, BlockchainEventType.VERIFIED)
                            .orElse(null)),
                    null
            ));
        }

        if (batch.getStatus() == BatchStatus.RECALLED) {
            steps.add(TimelineStepResponse.done(
                    "Recalled",
                    formatTimestamp(lastEventTime(blockchainEvents, BlockchainEventType.RECALLED)
                            .orElse(null)),
                    "Batch flagged and removed from active circulation"
            ));
        }

        return steps;
    }

    private static Optional<java.time.Instant> firstEventTime(List<BlockchainEvent> events, BlockchainEventType type) {
        return events.stream().filter(e -> e.getType() == type)
                .map(BlockchainEvent::getTimestamp)
                .findFirst();
    }

    private static Optional<java.time.Instant> lastEventTime(List<BlockchainEvent> events, BlockchainEventType type) {
        return events.stream().filter(e -> e.getType() == type)
                .map(BlockchainEvent::getTimestamp)
                .reduce((first, second) -> second);
    }

    private static String formatTimestamp(java.time.Instant instant) {
        return instant == null ? null : TIMESTAMP_FORMAT.format(instant);
    }
}
