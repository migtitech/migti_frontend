import { api } from "../api/axiosClient";

const BASE = "/notifications";

export const fetchNotifications = (params = {}) =>
  api.get(BASE, { params });

export const createNotifications = (body) => api.post(`${BASE}/create`, body);

export const markNotificationRead = (id) => api.patch(`${BASE}/${id}/read`);

export const markAllNotificationsRead = () =>
  api.post(`${BASE}/mark-all-read`);
