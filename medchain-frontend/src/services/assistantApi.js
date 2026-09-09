import { api } from "./apiClient";

export const assistantApi = {
  queryAssistant: (query) => api.post("/v1/assistant/query", { query }),
};
