import { api } from "./apiClient";

export const adminApi = {
  users: () => api.get("/admin/users"),
  organizations: () => api.get("/admin/organizations"),
  overview: () => api.get("/admin/overview"),
};
