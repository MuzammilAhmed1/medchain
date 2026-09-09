import { api } from "./apiClient";

export const coldChainApi = {
  getReadings: (batchId) => api.get(`/v1/cold-chain/batches/${batchId}`),
  getAlerts: (batchId) => api.get(`/v1/cold-chain/batches/${batchId}/alerts`),
  getActiveAlerts: () => api.get("/v1/cold-chain/alerts/active"),
  recordReading: (data) => api.post("/v1/cold-chain/readings", data),
};
