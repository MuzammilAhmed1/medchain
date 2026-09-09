import { api } from "./apiClient";

export const transferApi = {
  all: (status) => api.get("/transfers", { params: status ? { status } : {} }),
  pending: () => api.get("/transfers/pending"),
  history: () => api.get("/transfers/history"),
  get: (transferId) => api.get(`/transfers/${transferId}`),
  historyOf: (transferId) => api.get(`/transfers/${transferId}/history`),
  initiate: (payload) => api.post("/transfers", payload),
  start: (transferId) => api.post(`/transfers/${transferId}/start`),
  receive: (transferId) => api.post(`/transfers/${transferId}/receive`),
  getTrackingSummary: (transferId) => api.get(`/transfers/${transferId}/tracking`),
  getCurrentLocation: (transferId) => api.get(`/transfers/${transferId}/tracking/current`),
  getTrackingHistory: (transferId, params) => api.get(`/transfers/${transferId}/tracking/history`, { params }),
  getTrackingTrail: (transferId) => api.get(`/transfers/${transferId}/tracking/trail`),
  getRoute: (transferId) => api.get(`/transfers/${transferId}/tracking/route`),
  ingestLocation: (payload) => api.post("/tracking/location", payload),
  getDriverShipment: (shipmentNumber) => api.get(`/tracking/driver/shipment/${shipmentNumber}`, { auth: false }),
  cleanup: () => api.delete("/transfers/cleanup"),
};


