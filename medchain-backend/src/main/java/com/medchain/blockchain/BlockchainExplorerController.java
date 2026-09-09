package com.medchain.blockchain;

import com.medchain.blockchain.dto.BatchCustodyTimelineDto;
import com.medchain.blockchain.dto.BlockchainExplorerEventDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/blockchain/explorer")
@RequiredArgsConstructor
public class BlockchainExplorerController {

    private final BlockchainExplorerService blockchainExplorerService;

    @GetMapping("/events")
    public ResponseEntity<Page<BlockchainExplorerEventDto>> listExplorerEvents(
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(blockchainExplorerService.getEvents(pageable));
    }

    @GetMapping("/batches/{batchId}/timeline")
    public ResponseEntity<BatchCustodyTimelineDto> getBatchTimeline(@PathVariable String batchId) {
        return ResponseEntity.ok(blockchainExplorerService.getBatchCustodyTimeline(batchId));
    }
}
