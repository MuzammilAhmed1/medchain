package com.medchain.org;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/organizations")
@RequiredArgsConstructor
public class OrganizationController {

    private final OrganizationRepository organizationRepository;

    @GetMapping
    public ResponseEntity<List<OrganizationResponse>> list(
            @RequestParam(required = false) OrgType type
    ) {
        List<Organization> orgs = (type != null)
                ? organizationRepository.findAllByType(type)
                : organizationRepository.findAllByOrderByNameAsc();
        return ResponseEntity.ok(orgs.stream().map(OrganizationResponse::from).toList());
    }
}
