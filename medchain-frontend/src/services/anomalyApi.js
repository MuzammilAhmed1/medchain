import { api } from "./apiClient";

export const anomalyApi = {
  listAnomalies: (page = 0, size = 20) => api.get(`/v1/anomalies?page=${page}&size=${size}`),
  runAnalysis: (batchId) => api.post(`/v1/anomalies/analyze/${batchId}`),
  getBatchAnomalies: (batchId) => api.get(`/v1/anomalies/batches/${batchId}`),
};
