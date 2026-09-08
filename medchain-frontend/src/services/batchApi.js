import { api } from "./apiClient";

export const batchApi = {
  list: () => api.get("/batches"),
  get: (id) => api.get(`/batches/${encodeURIComponent(id)}`),
  create: (payload) => api.post("/batches", payload),
  recall: (id) => api.post(`/batches/${encodeURIComponent(id)}/recall`),
};
