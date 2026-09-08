package com.medchain.admin.dto;

public record SystemOverviewResponse(
        long totalBatches,
        long totalOrganizations,
        long totalUsers,
        long recalledBatches
) {
}
