package com.medchain.auth;

import com.medchain.auth.dto.AuthResponse;
import com.medchain.auth.dto.LoginRequest;
import com.medchain.auth.dto.RegisterRequest;
import com.medchain.common.exception.BadRequestException;
import com.medchain.org.OrgType;
import com.medchain.org.Organization;
import com.medchain.org.OrganizationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private OrganizationRepository organizationRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    private Organization testOrg;

    @BeforeEach
    void setUp() {
        testOrg = Organization.builder()
                .id(UUID.randomUUID())
                .name("Apex Pharma")
                .type(OrgType.MANUFACTURER)
                .build();
    }

    @Test
    void registerCreatesNewOrganizationAndUser() {
        RegisterRequest request = new RegisterRequest(
                "Dr. John Doe",
                "john@apex.com",
                "password123",
                "Apex Pharma",
                Role.MANUFACTURER,
                OrgType.MANUFACTURER
        );

        when(userRepository.existsByEmail("john@apex.com")).thenReturn(false);
        when(organizationRepository.findByName("Apex Pharma")).thenReturn(Optional.empty());
        when(organizationRepository.save(any(Organization.class))).thenReturn(testOrg);
        when(passwordEncoder.encode("password123")).thenReturn("encodedPassword");
        when(jwtService.generateToken(any())).thenReturn("mock-jwt-token");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        AuthResponse response = authService.register(request);

        assertThat(response.token()).isEqualTo("mock-jwt-token");
        assertThat(response.user().email()).isEqualTo("john@apex.com");
        assertThat(response.user().role()).isEqualTo(Role.MANUFACTURER);
        assertThat(response.user().organization()).isEqualTo("Apex Pharma");

        verify(userRepository).save(any(User.class));
    }

    @Test
    void registerThrowsWhenEmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest(
                "Jane Doe",
                "existing@apex.com",
                "password123",
                "Apex Pharma",
                Role.MANUFACTURER,
                OrgType.MANUFACTURER
        );

        when(userRepository.existsByEmail("existing@apex.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already exists");

        verify(userRepository, never()).save(any());
    }

    @Test
    void loginReturnsTokenAndUser() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .name("Jane Doe")
                .email("jane@apex.com")
                .role(Role.DISTRIBUTOR)
                .organization(testOrg)
                .build();

        when(userRepository.findByEmail("jane@apex.com")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(any())).thenReturn("jwt-123");

        AuthResponse response = authService.login(new LoginRequest("jane@apex.com", "secret"));

        assertThat(response.token()).isEqualTo("jwt-123");
        assertThat(response.user().email()).isEqualTo("jane@apex.com");
        verify(authenticationManager).authenticate(any());
    }
}
