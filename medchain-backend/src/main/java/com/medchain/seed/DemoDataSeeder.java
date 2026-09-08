package com.medchain.seed;

import com.medchain.auth.Role;
import com.medchain.auth.User;
import com.medchain.auth.UserRepository;
import com.medchain.org.OrgType;
import com.medchain.org.Organization;
import com.medchain.org.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds a handful of organizations and one login per role, purely so a
 * freshly-created local database has believable data to demo against
 * immediately (matches the demo flow in section 17 of the brief) instead
 * of starting completely empty. Controlled by medchain.seed.enabled -
 * safe to turn off for a real deployment.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DemoDataSeeder implements CommandLineRunner {

    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${medchain.seed.enabled:true}")
    private boolean enabled;

    private static final String DEMO_PASSWORD = "password123";

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled || organizationRepository.count() > 0) {
            return;
        }

        log.info("Seeding demo organizations and users (medchain.seed.enabled=true, empty database detected)");

        Organization abcPharma = org("ABC Pharmaceuticals", OrgType.MANUFACTURER);
        Organization novaMed = org("NovaMed Labs", OrgType.MANUFACTURER);
        Organization medLine = org("MedLine Distribution", OrgType.DISTRIBUTOR);
        Organization pharmaLink = org("PharmaLink Logistics", OrgType.DISTRIBUTOR);
        Organization cornerHealth = org("Corner Health Pharmacy", OrgType.PHARMACY);
        Organization mainStreet = org("MainStreet Pharmacy", OrgType.PHARMACY);

        Organization medchainAdminOrg = org("MedChain", OrgType.MANUFACTURER);

        user("Priya Shah", "priya@abcpharma.com", Role.MANUFACTURER, abcPharma);
        user("Tom Alvarez", "tom@novamed.com", Role.MANUFACTURER, novaMed);
        user("Grace Lin", "grace@medline.com", Role.DISTRIBUTOR, medLine);
        user("Sam Okoye", "sam@pharmalink.com", Role.DISTRIBUTOR, pharmaLink);
        user("Elena Petrov", "elena@cornerhealth.com", Role.PHARMACY, cornerHealth);
        user("Marcus Diallo", "marcus@mainstreetrx.com", Role.PHARMACY, mainStreet);
        user("Admin", "admin@medchain.dev", Role.ADMIN, medchainAdminOrg);

        log.info("Demo accounts ready - password for all: '{}'", DEMO_PASSWORD);
    }

    private Organization org(String name, OrgType type) {
        return organizationRepository.save(Organization.builder().name(name).type(type).build());
    }

    private void user(String name, String email, Role role, Organization organization) {
        userRepository.save(User.builder()
                .name(name)
                .email(email)
                .passwordHash(passwordEncoder.encode(DEMO_PASSWORD))
                .role(role)
                .organization(organization)
                .build());
    }
}
