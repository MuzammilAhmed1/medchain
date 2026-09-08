import { api } from "./apiClient";

export const verifyApi = {
  verify: (batchId) => api.get(`/verify/${encodeURIComponent(batchId)}`),
};
