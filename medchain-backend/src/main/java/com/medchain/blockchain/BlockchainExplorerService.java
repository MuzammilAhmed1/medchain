package com.medchain.blockchain;

import com.medchain.batch.BatchRepository;
import com.medchain.batch.MedicineBatch;
import com.medchain.blockchain.dto.BatchCustodyTimelineDto;
import com.medchain.blockchain.dto.BlockchainExplorerEventDto;
import com.medchain.common.exception.ResourceNotFoundException;
import com.medchain.transfer.Transfer;
import com.medchain.transfer.TransferRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BlockchainExplorerService {

    private final BlockchainEventRepository blockchainEventRepository;
    private final BatchRepository batchRepository;
    private final TransferRepository transferRepository;

    @Transactional(readOnly = true)
    public Page<BlockchainExplorerEventDto> getEvents(Pageable pageable) {
        return blockchainEventRepository.findAllByOrderByTimestampDesc(pageable)
                .map(BlockchainExplorerEventDto::from);
    }

    @Transactional(readOnly = true)
    public BatchCustodyTimelineDto getBatchCustodyTimeline(String batchId) {
        MedicineBatch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("MedicineBatch", "id", batchId));

        List<BlockchainEvent> bcEvents = blockchainEventRepository.findAllByBatchOrderByTimestampAsc(batch);
        Map<BlockchainEventType, BlockchainEvent> bcMap = bcEvents.stream()
                .collect(Collectors.toMap(BlockchainEvent::getType, e -> e, (e1, e2) -> e2));

        List<BatchCustodyTimelineDto.TimelineItemDto> items = new ArrayList<>();

        // 1. Creation stage
        BlockchainEvent createdBc = bcMap.get(BlockchainEventType.BATCH_CREATED);
        items.add(BatchCustodyTimelineDto.TimelineItemDto.builder()
                .stage("CREATED")
                .title("Batch Created")
                .description("Manufactured by " + batch.getManufacturer().getName() + " with initial quantity " + batch.getQuantity())
                .actor(batch.getManufacturer().getName())
                .txHash(createdBc != null ? createdBc.getTxHash() : null)
                .blockNumber(createdBc != null ? createdBc.getBlockNumber() : null)
                .timestamp(createdBc != null ? createdBc.getTimestamp() : batch.getCreatedAt())
                .isBlockchainConfirmed(createdBc != null)
                .build());

        // 2. Transfers
        List<Transfer> transfers = transferRepository.findAllByBatchOrderByInitiatedAtAsc(batch);
        for (Transfer t : transfers) {
            BlockchainEvent initBc = bcMap.get(BlockchainEventType.TRANSFER_INITIATED);
            items.add(BatchCustodyTimelineDto.TimelineItemDto.builder()
                    .stage("IN_TRANSIT")
                    .title("Transfer Initiated")
                    .description("Dispatched from " + t.getFromOrg().getName() + " to " + t.getToOrg().getName())
                    .actor(t.getFromOrg().getName())
                    .txHash(initBc != null ? initBc.getTxHash() : null)
                    .blockNumber(initBc != null ? initBc.getBlockNumber() : null)
                    .timestamp(t.getInitiatedAt())
                    .isBlockchainConfirmed(initBc != null)
                    .build());

            if (t.getReceivedAt() != null) {
                BlockchainEvent recvBc = bcMap.get(BlockchainEventType.TRANSFER_RECEIVED);
                items.add(BatchCustodyTimelineDto.TimelineItemDto.builder()
                        .stage("RECEIVED")
                        .title("Transfer Received")
                        .description("Custody accepted by " + t.getToOrg().getName())
                        .actor(t.getToOrg().getName())
                        .txHash(recvBc != null ? recvBc.getTxHash() : null)
                        .blockNumber(recvBc != null ? recvBc.getBlockNumber() : null)
                        .timestamp(t.getReceivedAt())
                        .isBlockchainConfirmed(recvBc != null)
                        .build());
            }
        }

        // 3. Verification if verified
        BlockchainEvent verifiedBc = bcMap.get(BlockchainEventType.VERIFIED);
        if (verifiedBc != null || batch.getStatus().name().equals("VERIFIED")) {
            items.add(BatchCustodyTimelineDto.TimelineItemDto.builder()
                    .stage("VERIFIED")
                    .title("Public Verification")
                    .description("Cryptographic authenticity verified on-chain")
                    .actor("Public / Auditor")
                    .txHash(verifiedBc != null ? verifiedBc.getTxHash() : null)
                    .blockNumber(verifiedBc != null ? verifiedBc.getBlockNumber() : null)
                    .timestamp(verifiedBc != null ? verifiedBc.getTimestamp() : batch.getUpdatedAt())
                    .isBlockchainConfirmed(verifiedBc != null)
                    .build());
        }

        // 4. Recall if recalled
        BlockchainEvent recalledBc = bcMap.get(BlockchainEventType.RECALLED);
        if (recalledBc != null || batch.getStatus().name().equals("RECALLED")) {
            items.add(BatchCustodyTimelineDto.TimelineItemDto.builder()
                    .stage("RECALLED")
                    .title("Batch Recalled")
                    .description("Recalled by manufacturer " + batch.getManufacturer().getName())
                    .actor(batch.getManufacturer().getName())
                    .txHash(recalledBc != null ? recalledBc.getTxHash() : null)
                    .blockNumber(recalledBc != null ? recalledBc.getBlockNumber() : null)
                    .timestamp(recalledBc != null ? recalledBc.getTimestamp() : batch.getUpdatedAt())
                    .isBlockchainConfirmed(recalledBc != null)
                    .build());
        }

        return BatchCustodyTimelineDto.builder()
                .batchId(batch.getId())
                .medicineName(batch.getMedicineName())
                .currentOwner(batch.getCurrentOwner().getName())
                .status(batch.getStatus().name())
                .timeline(items)
                .build();
    }
}
