import { api } from "./apiClient";

export const dashboardApi = {
  get: () => api.get("/dashboard"),
};
