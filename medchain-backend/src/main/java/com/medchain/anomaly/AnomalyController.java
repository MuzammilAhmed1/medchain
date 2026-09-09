package com.medchain.anomaly;

import com.medchain.anomaly.dto.AnomalyResponse;
import com.medchain.auth.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/anomalies")
@RequiredArgsConstructor
public class AnomalyController {

    private final AnomalyService anomalyService;

    @PostMapping("/analyze/{batchId}")
    public ResponseEntity<AnomalyResponse> runAnalysis(@PathVariable String batchId) {
        AnomalyEvent event = anomalyService.analyzeBatchAnomalies(batchId);
        return ResponseEntity.ok(AnomalyResponse.from(event));
    }

    @GetMapping
    public ResponseEntity<Page<AnomalyResponse>> listAnomalies(
            @AuthenticationPrincipal User user,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(anomalyService.getAnomalies(user, pageable));
    }

    @GetMapping("/batches/{batchId}")
    public ResponseEntity<List<AnomalyResponse>> getBatchAnomalies(@PathVariable String batchId) {
        return ResponseEntity.ok(anomalyService.getAnomaliesForBatch(batchId));
    }
}
