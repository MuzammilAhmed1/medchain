package com.medchain.verification.dto;

import com.medchain.batch.dto.BatchDetailResponse;

public record VerificationResponse(boolean found, boolean authentic, BatchDetailResponse batch) {
    public static VerificationResponse notFound() {
        return new VerificationResponse(false, false, null);
    }
}
