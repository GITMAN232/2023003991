import axios from "axios";
import { normalizeNotificationType } from "@/app/utils/notification-types";

// Always use proxy routes instead of direct external API calls
export const API_BASE_URL = "/api";

export const externalApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

export const apiClient = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

// Axios interceptors for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error for debugging
    if (process.env.NODE_ENV === "development") {
      console.error("API Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }
    return Promise.reject(error);
  }
);

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
  try {
    const response = await apiClient.get("/notifications", {
      params: {
        page,
        limit,
        notification_type: normalizeNotificationType(notificationType),
      },
    });

    return normalizeNotificationResponse(response.data);
  } catch (error) {
    throw new Error(
      error.response?.data?.error || "Failed to fetch notifications"
    );
  }
}

export async function postLog(payload) {
  try {
    const response = await apiClient.post("/logs", {
      stack: "frontend",
      level: "info",
      package: "notification_app_fe",
      ...payload,
      timestamp: new Date().toISOString(),
    });

    return response.data;
  } catch (error) {
    // Silent fail - logging should not break the application
    if (process.env.NODE_ENV === "development") {
      console.debug("Failed to post log:", error.message);
    }
    return null;
  }
}
