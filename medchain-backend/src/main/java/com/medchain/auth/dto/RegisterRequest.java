package com.medchain.auth.dto;

import com.medchain.auth.Role;
import com.medchain.org.OrgType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Name is required") String name,
        @NotBlank(message = "Email is required") @Email(message = "Must be a valid email") String email,
        @NotBlank(message = "Password is required") @Size(min = 6, message = "Password must be at least 6 characters") String password,
        @NotBlank(message = "Organization name is required") String organizationName,
        Role role,
        OrgType organizationType
) {
    public Role effectiveRole() {
        if (role != null) return role;
        if (organizationType != null) {
            return switch (organizationType) {
                case ADMIN -> Role.ADMIN;
                case MANUFACTURER -> Role.MANUFACTURER;
                case DISTRIBUTOR -> Role.DISTRIBUTOR;
                case PHARMACY -> Role.PHARMACY;
            };
        }
        return Role.MANUFACTURER;
    }
}
