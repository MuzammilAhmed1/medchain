package com.medchain.org;

import com.medchain.auth.Role;
import com.medchain.auth.User;
import com.medchain.common.exception.ForbiddenActionException;
import com.medchain.common.exception.ResourceNotFoundException;
import com.medchain.geo.GoogleGeocodingService;
import com.medchain.org.dto.UpdateOrganizationLocationRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/organizations")
@RequiredArgsConstructor
@Slf4j
public class OrganizationController {

    private final OrganizationRepository organizationRepository;
    private final GoogleGeocodingService geocodingService;

    @GetMapping
    public ResponseEntity<List<OrganizationResponse>> list(
            @RequestParam(required = false) OrgType type
    ) {
        List<Organization> orgs = (type != null)
                ? organizationRepository.findAllByType(type)
                : organizationRepository.findAllByOrderByNameAsc();
        return ResponseEntity.ok(orgs.stream().map(OrganizationResponse::from).toList());
    }

    @GetMapping("/current")
    public ResponseEntity<OrganizationResponse> current(@AuthenticationPrincipal User currentUser) {
        if (currentUser.getOrganization() == null) {
            throw new ResourceNotFoundException("User does not belong to any organization.");
        }
        return ResponseEntity.ok(OrganizationResponse.from(currentUser.getOrganization()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrganizationResponse> getById(@PathVariable UUID id) {
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + id));
        return ResponseEntity.ok(OrganizationResponse.from(org));
    }

    @PutMapping("/current/location")
    public ResponseEntity<OrganizationResponse> updateCurrentLocation(
            @Valid @RequestBody UpdateOrganizationLocationRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser.getOrganization() == null) {
            throw new ForbiddenActionException("User does not belong to any organization.");
        }
        return updateOrgLocationInternal(currentUser.getOrganization().getId(), request);
    }

    @PutMapping("/{id}/location")
    public ResponseEntity<OrganizationResponse> updateLocation(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateOrganizationLocationRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        // Only members of this organization or system ADMIN can update its location
        if (currentUser.getRole() != Role.ADMIN && 
                (currentUser.getOrganization() == null || !currentUser.getOrganization().getId().equals(id))) {
            throw new ForbiddenActionException("You are not authorized to update location for this organization.");
        }
        return updateOrgLocationInternal(id, request);
    }

    private ResponseEntity<OrganizationResponse> updateOrgLocationInternal(UUID id, UpdateOrganizationLocationRequest request) {
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + id));

        org.setAddress(request.address().trim());
        org.setCity(request.city() != null ? request.city().trim() : null);
        org.setState(request.state() != null ? request.state().trim() : null);
        org.setPostalCode(request.postalCode() != null ? request.postalCode().trim() : null);
        org.setCountry(request.country() != null && !request.country().isBlank() ? request.country().trim() : "India");

        String fullAddress = org.buildFullAddressString();

        if (request.latitude() != null && request.longitude() != null) {
            org.setLatitude(request.latitude());
            org.setLongitude(request.longitude());
            if (org.getFormattedAddress() == null || org.getFormattedAddress().isBlank()) {
                org.setFormattedAddress(fullAddress);
            }
            log.info("Set explicit location for organization '{}': ({}, {})", org.getName(), org.getLatitude(), org.getLongitude());
        } else {
            // Attempt Google geocoding if configured, otherwise coordinates remain null safely
            geocodingService.geocode(fullAddress).ifPresentOrElse(
                    geo -> {
                        org.setLatitude(geo.latitude());
                        org.setLongitude(geo.longitude());
                        org.setFormattedAddress(geo.formattedAddress());
                        org.setPlaceId(geo.placeId());
                        log.info("Geocoded organization '{}' to ({}, {})", org.getName(), geo.latitude(), geo.longitude());
                    },
                    () -> {
                        log.info("Geocoding not available or returned no results for '{}'. Address saved without coordinates.", fullAddress);
                        // Do NOT invent fake coordinates! Leave existing or null
                        if (org.getFormattedAddress() == null || org.getFormattedAddress().isBlank()) {
                            org.setFormattedAddress(fullAddress);
                        }
                    }
            );
        }

        Organization saved = organizationRepository.save(org);
        return ResponseEntity.ok(OrganizationResponse.from(saved));
    }
}
