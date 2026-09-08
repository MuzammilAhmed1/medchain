package com.medchain.dashboard;

public record DashboardStats(long total, long verified, long inTransit, long received, long highRisk) {
}
