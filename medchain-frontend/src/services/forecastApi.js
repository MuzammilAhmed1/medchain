import { api } from "./apiClient";

export const forecastApi = {
  getDemandPredictions: () => api.get("/v1/predictions/demand"),
  getExpiryPrediction: (batchId) => api.get(`/v1/predictions/expiry/${batchId}`),
  getHighExpiryRisk: () => api.get("/v1/predictions/expiry"),
};
