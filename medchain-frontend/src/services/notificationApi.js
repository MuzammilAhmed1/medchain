import { api } from "./apiClient";

export const notificationApi = {
  getNotifications: (page = 0, size = 20) => api.get(`/v1/notifications?page=${page}&size=${size}`),
  getUnreadCount: () => api.get("/v1/notifications/unread-count"),
  markAsRead: (id) => api.patch(`/v1/notifications/${id}/read`),
  markAllAsRead: () => api.post("/v1/notifications/read-all"),
};
