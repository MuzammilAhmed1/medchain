package com.medchain.org;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "organizations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Organization {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrgType type;

    /**
     * The blockchain address associated with this organization. In the MVP
     * integration a single backend relayer key signs every transaction
     * (see blockchain/README notes), so this field is currently used for
     * record-keeping and future per-org key support rather than for
     * on-chain authorization.
     */
    @Column(name = "wallet_address")
    private String walletAddress;
}
