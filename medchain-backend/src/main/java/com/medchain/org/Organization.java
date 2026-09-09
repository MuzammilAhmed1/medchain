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

    @Column(name = "address")
    private String address;

    @Column(name = "city")
    private String city;

    @Column(name = "state")
    private String state;

    @Column(name = "postal_code")
    private String postalCode;

    @Column(name = "country")
    @Builder.Default
    private String country = "India";

    @Column(name = "formatted_address", length = 500)
    private String formattedAddress;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "place_id")
    private String placeId;

    public String buildFullAddressString() {
        StringBuilder sb = new StringBuilder();
        if (address != null && !address.isBlank()) sb.append(address.trim());
        if (city != null && !city.isBlank()) {
            if (sb.length() > 0) sb.append(", ");
            sb.append(city.trim());
        }
        if (state != null && !state.isBlank()) {
            if (sb.length() > 0) sb.append(", ");
            sb.append(state.trim());
        }
        if (postalCode != null && !postalCode.isBlank()) {
            if (sb.length() > 0) sb.append(" ");
            sb.append(postalCode.trim());
        }
        if (country != null && !country.isBlank()) {
            if (sb.length() > 0) sb.append(", ");
            sb.append(country.trim());
        }
        return sb.toString();
    }
}
