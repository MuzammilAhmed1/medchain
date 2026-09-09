package com.medchain.org.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateOrganizationLocationRequest(
        @NotBlank(message = "Address is required") String address,
        String city,
        String state,
        String postalCode,
        String country,
        Double latitude,
        Double longitude
) {
    public UpdateOrganizationLocationRequest(String address, String city, String state, String postalCode, String country) {
        this(address, city, state, postalCode, country, null, null);
    }
}

