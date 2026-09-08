package com.medchain.transfer.dto;

import jakarta.validation.constraints.NotBlank;

public record InitiateTransferRequest(
        @NotBlank(message = "batchId is required") String batchId,
        @NotBlank(message = "toOrganizationName is required") String toOrganizationName
) {
}
