package com.medchain.admin;

import com.medchain.admin.dto.SystemOverviewResponse;
import com.medchain.auth.UserRepository;
import com.medchain.auth.dto.UserResponse;
import com.medchain.batch.BatchRepository;
import com.medchain.batch.BatchStatus;
import com.medchain.org.OrganizationRepository;
import com.medchain.org.OrganizationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final BatchRepository batchRepository;

    @GetMapping("/users")
    public ResponseEntity<List<UserResponse>> users() {
        return ResponseEntity.ok(
                userRepository.findAllByOrderByNameAsc().stream().map(UserResponse::from).toList());
    }

    @GetMapping("/organizations")
    public ResponseEntity<List<OrganizationResponse>> organizations() {
        return ResponseEntity.ok(
                organizationRepository.findAll().stream().map(OrganizationResponse::from).toList());
    }

    @GetMapping("/overview")
    public ResponseEntity<SystemOverviewResponse> overview() {
        return ResponseEntity.ok(new SystemOverviewResponse(
                batchRepository.count(),
                organizationRepository.count(),
                userRepository.count(),
                batchRepository.countByStatus(BatchStatus.RECALLED)
        ));
    }
}
