package com.medchain.batch;

import com.medchain.batch.dto.TimelineStepResponse;
import com.medchain.blockchain.BlockchainEvent;
import com.medchain.blockchain.BlockchainEventType;
import com.medchain.org.OrgType;
import com.medchain.org.Organization;
import com.medchain.transfer.Transfer;
import com.medchain.transfer.TransferStatus;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TimelineBuilderTest {

    private final Organization manufacturer = Organization.builder()
            .name("ABC Pharmaceuticals").type(OrgType.MANUFACTURER).build();
    private final Organization distributor = Organization.builder()
            .name("MedLine Distribution").type(OrgType.DISTRIBUTOR).build();

    private MedicineBatch baseBatch(BatchStatus status) {
        return MedicineBatch.builder()
                .id("MC-2026-00001")
                .medicineName("Amoxicillin 500mg")
                .manufacturer(manufacturer)
                .currentOwner(manufacturer)
                .manufacturingDate(LocalDate.of(2026, 1, 10))
                .expiryDate(LocalDate.of(2027, 1, 10))
                .quantity(1000)
                .status(status)
                .createdAt(Instant.parse("2026-01-10T09:00:00Z"))
                .build();
    }

    @Test
    void freshlyCreatedBatchGetsACreatedStepAndAPendingNextStep() {
        MedicineBatch batch = baseBatch(BatchStatus.CREATED);

        List<TimelineStepResponse> steps = TimelineBuilder.build(batch, List.of(), List.of());

        assertThat(steps).hasSize(2);
        assertThat(steps.get(0).title()).isEqualTo("Batch created");
        assertThat(steps.get(0).state()).isEqualTo("done");
        assertThat(steps.get(1).title()).isEqualTo("Sent to distributor");
        assertThat(steps.get(1).state()).isEqualTo("pending");
    }

    @Test
    void inProgressTransferShowsAsCurrentNotDone() {
        MedicineBatch batch = baseBatch(BatchStatus.IN_TRANSIT);
        Transfer pending = Transfer.builder()
                .batch(batch).fromOrg(manufacturer).toOrg(distributor)
                .status(TransferStatus.INITIATED)
                .initiatedAt(Instant.parse("2026-01-12T10:00:00Z"))
                .receivedAt(null)
                .build();

        List<TimelineStepResponse> steps = TimelineBuilder.build(batch, List.of(pending), List.of());

        assertThat(steps).hasSize(3); // created, sent, received(current)
        assertThat(steps.get(1).title()).isEqualTo("Sent to MedLine Distribution");
        assertThat(steps.get(1).state()).isEqualTo("done");
        assertThat(steps.get(2).title()).isEqualTo("Received by MedLine Distribution");
        assertThat(steps.get(2).state()).isEqualTo("current");
        assertThat(steps.get(2).timestamp()).isEqualTo("In progress");
    }

    @Test
    void completedTransferShowsBothStepsAsDone() {
        MedicineBatch batch = baseBatch(BatchStatus.RECEIVED);
        Transfer completed = Transfer.builder()
                .batch(batch).fromOrg(manufacturer).toOrg(distributor)
                .status(TransferStatus.RECEIVED)
                .initiatedAt(Instant.parse("2026-01-12T10:00:00Z"))
                .receivedAt(Instant.parse("2026-01-13T08:00:00Z"))
                .build();

        List<TimelineStepResponse> steps = TimelineBuilder.build(batch, List.of(completed), List.of());

        assertThat(steps).hasSize(3);
        assertThat(steps.get(2).state()).isEqualTo("done");
        assertThat(steps.get(2).timestamp()).isEqualTo("2026-01-13 08:00");
    }

    @Test
    void verifiedBatchAppendsAVerifiedStep() {
        MedicineBatch batch = baseBatch(BatchStatus.VERIFIED);
        BlockchainEvent verifiedEvent = BlockchainEvent.builder()
                .batch(batch).type(BlockchainEventType.VERIFIED)
                .txHash("0xabc").blockNumber(100)
                .timestamp(Instant.parse("2026-01-15T09:00:00Z"))
                .build();

        List<TimelineStepResponse> steps = TimelineBuilder.build(batch, List.of(), List.of(verifiedEvent));

        TimelineStepResponse last = steps.get(steps.size() - 1);
        assertThat(last.title()).isEqualTo("Verified");
        assertThat(last.state()).isEqualTo("done");
        assertThat(last.timestamp()).isEqualTo("2026-01-15 09:00");
    }

    @Test
    void recalledBatchAppendsARecalledStepWithADescription() {
        MedicineBatch batch = baseBatch(BatchStatus.RECALLED);

        List<TimelineStepResponse> steps = TimelineBuilder.build(batch, List.of(), List.of());

        TimelineStepResponse last = steps.get(steps.size() - 1);
        assertThat(last.title()).isEqualTo("Recalled");
        assertThat(last.description()).isNotBlank();
    }
}
