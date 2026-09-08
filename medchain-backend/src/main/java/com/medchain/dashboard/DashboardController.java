package com.medchain.dashboard;

import com.medchain.audit.AuditEventService;
import com.medchain.audit.dto.ActivityItemResponse;
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
    private final AuditEventService auditEventService;

    @GetMapping
    public ResponseEntity<DashboardResponse> get() {
        long total = batchRepository.count();
        long recalled = batchRepository.countByStatus(BatchStatus.RECALLED);
        long inTransit = batchRepository.countByStatus(BatchStatus.IN_TRANSIT);
        long received = batchRepository.countByStatus(BatchStatus.RECEIVED);
        long verified = batchRepository.countByStatus(BatchStatus.VERIFIED);
        long highRisk = batchRepository.countByRiskLevel(RiskLevel.HIGH);
        long active = Math.max(0, total - recalled);

        DashboardStats stats = new DashboardStats(
                total,
                active,
                inTransit,
                received,
                verified,
                highRisk,
                recalled
        );

        List<BatchSummaryResponse> recentBatches = batchRepository.findTop5ByOrderByCreatedAtDesc()
                .stream().map(BatchSummaryResponse::from).toList();

        List<TransferResponse> recentTransfers = transferRepository.findTop3ByOrderByInitiatedAtDesc()
                .stream().map(TransferResponse::from).toList();

        List<RiskAlertResponse> riskAlerts = batchRepository
                .findAllByRiskLevelInOrderByRiskScoreDesc(List.of(RiskLevel.MEDIUM, RiskLevel.HIGH))
                .stream().limit(5).map(RiskAlertResponse::from).toList();

        List<ActivityItemResponse> recentActivity = auditEventService.getRecentActivity()
                .stream().map(ActivityItemResponse::from).toList();

        return ResponseEntity.ok(new DashboardResponse(stats, recentBatches, recentTransfers, riskAlerts, recentActivity));
    }
}
