package com.medchain.auth.dto;

import com.medchain.auth.Role;
import com.medchain.auth.User;

public record UserResponse(
        String id,
        String name,
        String email,
        Role role,
        String organization
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId() != null ? user.getId().toString() : null,
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getOrganization() != null ? user.getOrganization().getName() : null
        );
    }
}