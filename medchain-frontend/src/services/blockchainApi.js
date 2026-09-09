import { api } from "./apiClient";

export const blockchainApi = {
  getExplorerEvents: (page = 0, size = 20) => api.get(`/v1/blockchain/explorer/events?page=${page}&size=${size}`),
  getBatchTimeline: (batchId) => api.get(`/v1/blockchain/explorer/batches/${batchId}/timeline`),
};
