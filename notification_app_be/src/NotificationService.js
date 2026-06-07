/**
 * Notification Service
 * 
 * Orchestrates notification fetching and priority management.
 * Serves as the main API for notification operations.
 */

const { PriorityNotificationManager } = require('./PriorityNotificationManager');
const { fetchNotificationsWithRetry, postLog } = require('./api-client');
const { v4: uuidv4 } = require('uuid');

class NotificationService {
  constructor() {
    this.manager = new PriorityNotificationManager(10);
    this.cache = null;
    this.lastFetchTime = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Fetch and process notifications
   */
  async fetchAndProcessNotifications(params = {}) {
    const requestId = uuidv4();

    try {
      // Log request
      await postLog({
        level: 'info',
        message: 'Fetching notifications',
        package: 'service',
        data: { requestId, params }
      });

      // Fetch from external API
      const result = await fetchNotificationsWithRetry(params);

      if (!result.success) {
        await postLog({
          level: 'error',
          message: 'Failed to fetch notifications',
          package: 'service',
          data: { requestId, error: result.error }
        });
        return {
          success: false,
          error: result.error,
          notifications: [],
          stats: {}
        };
      }

      // Extract notifications from response
      const notifications = Array.isArray(result.data) 
        ? result.data 
        : result.data.data || result.data.notifications || [];

      // Process notifications through priority manager
      this.manager.clear();
      let processed = 0;
      notifications.forEach(notification => {
        if (this.manager.processNotification(notification)) {
          processed++;
        }
      });

      // Get top notifications
      const topNotifications = this.manager.getTopNotifications();
      const stats = this.manager.getStats();

      // Cache result
      this.cache = topNotifications;
      this.lastFetchTime = Date.now();

      await postLog({
        level: 'info',
        message: 'Notifications processed',
        package: 'service',
        data: {
          requestId,
          received: notifications.length,
          processed,
          topCount: topNotifications.length,
          stats
        }
      });

      return {
        success: true,
        notifications: topNotifications,
        stats,
        totalReceived: notifications.length,
        cached: false
      };
    } catch (error) {
      await postLog({
        level: 'error',
        message: 'Notification service error',
        package: 'service',
        data: { requestId, error: error.message },
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        notifications: [],
        stats: {}
      };
    }
  }

  /**
   * Get top notifications (with optional caching)
   */
  async getTopNotifications(useCache = true) {
    if (useCache && this.cache && this.lastFetchTime) {
      const cacheAge = Date.now() - this.lastFetchTime;
      if (cacheAge < this.cacheTimeout) {
        return {
          success: true,
          notifications: this.cache,
          stats: this.manager.getStats(),
          cached: true,
          cacheAge
        };
      }
    }

    return this.fetchAndProcessNotifications();
  }

  /**
   * Get notifications by type
   */
  async getNotificationsByType(type) {
    const result = await this.getTopNotifications();

    if (!result.success) {
      return result;
    }

    const filtered = result.notifications.filter(n => n.type === type);

    return {
      ...result,
      notifications: filtered,
      filteredCount: filtered.length
    };
  }

  /**
   * Get notification statistics
   */
  getStatistics() {
    return {
      cached: !!this.cache,
      cacheAge: this.lastFetchTime ? Date.now() - this.lastFetchTime : null,
      stats: this.manager.getStats()
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache = null;
    this.lastFetchTime = null;
  }
}

module.exports = { NotificationService };
