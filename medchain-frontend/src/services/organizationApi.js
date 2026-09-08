import { api } from "./apiClient";

export const organizationApi = {
  list: (type) => api.get(type ? `/organizations?type=${encodeURIComponent(type)}` : "/organizations"),
};
