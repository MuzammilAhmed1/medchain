package com.medchain.dashboard;

import com.medchain.batch.BatchRepository;
import com.medchain.batch.BatchStatus;
import com.medchain.batch.RiskLevel;
import com.medchain.batch.dto.BatchSummaryResponse;
import com.medchain.transfer.TransferRepository;
import com.medchain.transfer.dto.TransferResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final BatchRepository batchRepository;
    private final TransferRepository transferRepository;

    @GetMapping
    public ResponseEntity<DashboardResponse> get() {
        DashboardStats stats = new DashboardStats(
                batchRepository.count(),
                batchRepository.countByStatus(BatchStatus.VERIFIED),
                batchRepository.countByStatus(BatchStatus.IN_TRANSIT),
                batchRepository.countByStatus(BatchStatus.RECEIVED),
                batchRepository.countByRiskLevel(RiskLevel.HIGH)
        );

        List<BatchSummaryResponse> recentBatches = batchRepository.findTop5ByOrderByCreatedAtDesc()
                .stream().map(BatchSummaryResponse::from).toList();

        List<TransferResponse> recentTransfers = transferRepository.findTop3ByOrderByInitiatedAtDesc()
                .stream().map(TransferResponse::from).toList();

        List<RiskAlertResponse> riskAlerts = batchRepository
                .findAllByRiskLevelInOrderByRiskScoreDesc(List.of(RiskLevel.MEDIUM, RiskLevel.HIGH))
                .stream().limit(3).map(RiskAlertResponse::from).toList();

        return ResponseEntity.ok(new DashboardResponse(stats, recentBatches, recentTransfers, riskAlerts));
    }
}
