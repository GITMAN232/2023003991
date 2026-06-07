import axios from "axios";
import { normalizeNotificationType } from "@/app/utils/notification-types";

export const API_BASE_URL = "http://4.224.186.213/evaluation-service";

export const externalApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

export const apiClient = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

export function normalizeNotificationResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.message)) return payload.message;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
}

export async function fetchNotifications({
  page = 1,
  limit = 20,
  notificationType = "",
} = {}) {
  const response = await apiClient.get("/notifications", {
    params: {
      page,
      limit,
      notification_type: normalizeNotificationType(notificationType),
    },
  });

  return normalizeNotificationResponse(response.data);
}

export async function postLog(payload) {
  const response = await apiClient.post("/logs", {
    stack: "frontend",
    level: "info",
    package: "notification_app_fe",
    ...payload,
    timestamp: new Date().toISOString(),
  });

  return response.data;
}
