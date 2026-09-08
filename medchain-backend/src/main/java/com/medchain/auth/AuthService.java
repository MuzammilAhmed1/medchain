package com.medchain.auth;

import com.medchain.auth.dto.AuthResponse;
import com.medchain.auth.dto.LoginRequest;
import com.medchain.auth.dto.RegisterRequest;
import com.medchain.auth.dto.UserResponse;
import com.medchain.common.exception.BadRequestException;
import com.medchain.org.Organization;
import com.medchain.org.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BadRequestException("An account with this email already exists.");
        }

        Organization organization = organizationRepository.findByName(request.organizationName())
                .orElseGet(() -> {
                    if (request.organizationType() == null) {
                        throw new BadRequestException(
                                "organizationType is required when registering a new organization.");
                    }
                    return organizationRepository.save(Organization.builder()
                            .name(request.organizationName())
                            .type(request.organizationType())
                            .build());
                });

        Role role = switch (organization.getType()) {
            case MANUFACTURER -> Role.MANUFACTURER;
            case DISTRIBUTOR -> Role.DISTRIBUTOR;
            case PHARMACY -> Role.PHARMACY;
        };

        User user = userRepository.save(User.builder()
                .name(request.name())
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(role)
                .organization(organization)
                .build());

        String token = jwtService.generateToken(user);
        return new AuthResponse(token, UserResponse.from(user));
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadRequestException("Invalid email or password."));

        String token = jwtService.generateToken(user);
        return new AuthResponse(token, UserResponse.from(user));
    }
}
