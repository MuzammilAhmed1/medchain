package com.medchain.org;

public record OrganizationResponse(String id, String name, OrgType type) {
    public static OrganizationResponse from(Organization org) {
        return new OrganizationResponse(org.getId().toString(), org.getName(), org.getType());
    }
}
