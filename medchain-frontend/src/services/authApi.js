import { api } from "./apiClient";

export const authApi = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  register: (payload) => api.post("/auth/register", payload),
  me: () => api.get("/auth/me"),
};
