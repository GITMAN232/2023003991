import {
  apiClient,
  API_BASE_URL,
  normalizeNotificationResponse,
} from "./api";
import { normalizeNotificationType } from "@/app/utils/notification-types";
import { logger as defaultLogger, toErrorMessage } from "./logger";
import { PriorityNotificationManager } from "./PriorityNotificationManager";

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class NotificationService {
  constructor({ client = apiClient, logger = defaultLogger } = {}) {
    this.client = client;
    this.logger = logger;
  }

  async fetchNotifications({
    page = 1,
    limit = 100,
    notificationType = "",
  } = {}) {
    const params = {
      page,
      limit,
      notification_type: normalizeNotificationType(notificationType),
    };

    await this.logger.info("api_request_started", {
      method: "GET",
      url: `${API_BASE_URL}/notifications`,
      params,
    });

    try {
      const response = await this.client.get("/notifications", { params });
      const notifications = normalizeNotificationResponse(response.data);

      await this.logger.info("api_request_completed", {
        method: "GET",
        url: `${API_BASE_URL}/notifications`,
        status: response.status,
        notificationCount: notifications.length,
        params,
      });

      return notifications;
    } catch (error) {
      await this.logger.error("api_request_failed", {
        method: "GET",
        url: `${API_BASE_URL}/notifications`,
        params,
        error: toErrorMessage(error),
      });

      throw error;
    }
  }

  async fetchNotificationsWithRetry({
    page = 1,
    limit = 100,
    notificationType = "",
    retryCount = 2,
    retryDelayMs = 500,
  } = {}) {
    let lastError;

    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        return await this.fetchNotifications({
          page,
          limit,
          notificationType,
        });
      } catch (error) {
        lastError = error;
        if (attempt === retryCount) break;

        await this.logger.warn("api_request_retry_scheduled", {
          attempt: attempt + 1,
          nextAttempt: attempt + 2,
          retryDelayMs,
          error: toErrorMessage(error),
        });
        await delay(retryDelayMs * (attempt + 1));
      }
    }

    throw lastError;
  }

  async getTopUnreadNotifications({
    page = 1,
    limit = 100,
    topN = 10,
    notificationType = "",
    retryCount = 2,
    retryDelayMs = 500,
    manager = new PriorityNotificationManager({
      topN,
      logger: this.logger,
    }),
  } = {}) {
    const notifications = await this.fetchNotificationsWithRetry({
      page,
      limit,
      notificationType,
      retryCount,
      retryDelayMs,
    });

    await manager.processNotifications(notifications);

    return {
      notifications: manager.getTopNotifications(),
      stats: manager.getStats(),
    };
  }
}

export const notificationService = new NotificationService();
