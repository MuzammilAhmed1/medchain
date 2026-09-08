package com.medchain.dashboard;

import com.medchain.audit.dto.ActivityItemResponse;
import com.medchain.batch.dto.BatchSummaryResponse;
import com.medchain.transfer.dto.TransferResponse;

import java.util.List;

public record DashboardResponse(
        DashboardStats stats,
        List<BatchSummaryResponse> recentBatches,
        List<TransferResponse> recentTransfers,
        List<RiskAlertResponse> riskAlerts,
        List<ActivityItemResponse> recentActivity
) {
}
