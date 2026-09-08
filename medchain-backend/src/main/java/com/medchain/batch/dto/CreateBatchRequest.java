package com.medchain.batch.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;

import java.time.LocalDate;

public record CreateBatchRequest(
        @NotBlank(message = "Medicine name is required") String medicineName,
        @NotNull(message = "Manufacturing date is required") @PastOrPresent(message = "Manufacturing date cannot be in the future")
        LocalDate manufacturingDate,
        @NotNull(message = "Expiry date is required") @Future(message = "Expiry date must be in the future")
        LocalDate expiryDate,
        @NotNull(message = "Quantity is required") @Min(value = 1, message = "Quantity must be at least 1")
        Integer quantity
) {
}
