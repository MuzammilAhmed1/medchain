package com.medchain.auth;

import com.medchain.auth.dto.AuthResponse;
import com.medchain.auth.dto.LoginRequest;
import com.medchain.auth.dto.RegisterRequest;
import com.medchain.auth.dto.UserResponse;
import com.medchain.common.exception.BadRequestException;
import com.medchain.org.Organization;
import com.medchain.org.OrganizationRepository;
import com.medchain.org.OrgType;
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

        Role role = request.effectiveRole();
        OrgType inferredOrgType = switch (role) {
            case ADMIN -> OrgType.ADMIN;
            case MANUFACTURER -> OrgType.MANUFACTURER;
            case DISTRIBUTOR -> OrgType.DISTRIBUTOR;
            case PHARMACY -> OrgType.PHARMACY;
        };

        OrgType targetOrgType = request.organizationType() != null ? request.organizationType() : inferredOrgType;

        Organization organization = organizationRepository.findByName(request.organizationName())
                .map(existingOrg -> {
                    if (existingOrg.getType() != targetOrgType && role != Role.ADMIN) {
                        existingOrg.setType(targetOrgType);
                        return organizationRepository.save(existingOrg);
                    }
                    return existingOrg;
                })
                .orElseGet(() -> organizationRepository.save(Organization.builder()
                        .name(request.organizationName())
                        .type(targetOrgType)
                        .build()));

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
