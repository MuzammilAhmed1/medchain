import { api } from "./apiClient";

export const transferApi = {
  all: () => api.get("/transfers"),
  pending: () => api.get("/transfers/pending"),
  history: () => api.get("/transfers/history"),
  initiate: (payload) => api.post("/transfers", payload),
  receive: (transferId) => api.post(`/transfers/${transferId}/receive`),
};
