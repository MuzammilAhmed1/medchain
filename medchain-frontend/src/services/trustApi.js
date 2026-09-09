import { api } from "./apiClient";

export const trustApi = {
  getOrganizationScore: (orgId) => api.get(`/v1/organizations/${orgId}/trust-score`),
  getAllScores: () => api.get("/v1/organizations/trust-scores"),
};
