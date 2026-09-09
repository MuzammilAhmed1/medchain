import { api } from "./apiClient";

export const organizationApi = {
  list: (type) => api.get(type ? `/organizations?type=${encodeURIComponent(type)}` : "/organizations"),
  current: () => api.get("/organizations/current"),
  get: (id) => api.get(`/organizations/${id}`),
  updateCurrentLocation: (payload) => api.put("/organizations/current/location", payload),
  updateLocation: (id, payload) => api.put(`/organizations/${id}/location`, payload),
};

