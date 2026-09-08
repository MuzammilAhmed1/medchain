package com.medchain.auth.dto;

public record AuthResponse(String token, UserResponse user) {
}
