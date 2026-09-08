package com.medchain.auth.dto;

import com.medchain.org.OrgType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record RegisterRequest(
        @NotBlank(message = "Name is required") String name,
        @NotBlank(message = "Email is required") @Email(message = "Must be a valid email") String email,
        @NotBlank(message = "Password is required") String password,
        @NotBlank(message = "Organization name is required") String organizationName,
        OrgType organizationType
) {
}
