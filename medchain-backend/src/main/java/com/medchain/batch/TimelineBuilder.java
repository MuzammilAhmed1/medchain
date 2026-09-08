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
