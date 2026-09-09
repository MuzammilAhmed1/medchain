package com.medchain.org;

public record OrganizationResponse(
        String id,
        String name,
        OrgType type,
        String walletAddress,
        String address,
        String city,
        String state,
        String postalCode,
        String country,
        String formattedAddress,
        Double latitude,
        Double longitude,
        String placeId
) {
    public static OrganizationResponse from(Organization org) {
        return new OrganizationResponse(
                org.getId().toString(),
                org.getName(),
                org.getType(),
                org.getWalletAddress(),
                org.getAddress(),
                org.getCity(),
                org.getState(),
                org.getPostalCode(),
                org.getCountry(),
                org.getFormattedAddress(),
                org.getLatitude(),
                org.getLongitude(),
                org.getPlaceId()
        );
    }
}
