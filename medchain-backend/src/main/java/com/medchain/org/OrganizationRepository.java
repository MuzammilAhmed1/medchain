package com.medchain.org;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {
    Optional<Organization> findByName(String name);
    boolean existsByName(String name);
    java.util.List<Organization> findAllByType(OrgType type);
    java.util.List<Organization> findAllByOrderByNameAsc();
}
