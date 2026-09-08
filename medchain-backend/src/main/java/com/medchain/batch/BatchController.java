package com.medchain.batch;

import com.medchain.auth.User;
import com.medchain.batch.dto.BatchDetailResponse;
import com.medchain.batch.dto.BatchSummaryResponse;
import com.medchain.batch.dto.CreateBatchRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/batches")
@RequiredArgsConstructor
public class BatchController {

    private final BatchService batchService;

    @GetMapping
    public ResponseEntity<List<BatchSummaryResponse>> list() {
        return ResponseEntity.ok(batchService.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BatchDetailResponse> detail(@PathVariable String id) {
        return ResponseEntity.ok(batchService.getDetail(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<BatchDetailResponse> create(
            @Valid @RequestBody CreateBatchRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(batchService.createBatch(request, currentUser));
    }

    @PostMapping("/{id}/recall")
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<BatchDetailResponse> recall(
            @PathVariable String id,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(batchService.recall(id, currentUser));
    }
}
