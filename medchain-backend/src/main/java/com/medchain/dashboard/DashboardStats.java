package com.medchain.dashboard;

public record DashboardStats(
        long total,
        long active,
        long inTransit,
        long received,
        long verified,
        long highRisk,
        long recalled
) {
}
