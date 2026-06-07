/**
 * Backend Notification Service
 * 
 * Express server providing API endpoints for:
 * - Notification fetching with priority management
 * - Notification filtering by type
 * - Statistics and health checks
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
require('dotenv').config();

const { NotificationService } = require('./NotificationService');
const { postLog } = require('./api-client');

const port = process.env.PORT || 3000;
const app = express();
const notificationService = new NotificationService();

// Middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());

// Request tracking middleware
app.use((req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.startTime = Date.now();
  next();
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'notification-app-be',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET /api/notifications
 * Fetch top priority notifications
 * 
 * Query params:
 * - page: int (default: 1)
 * - limit: int (default: 10)
 * - notification_type: string (optional: filter by type)
 * - cache: boolean (default: true)
 */
app.get('/api/notifications', async (req, res) => {
  try {
    const { page = 1, limit = 10, notification_type, cache = 'true' } = req.query;
    const useCache = cache !== 'false';

    let result;
    if (notification_type) {
      result = await notificationService.getNotificationsByType(notification_type);
    } else {
      result = await notificationService.getTopNotifications(useCache);
    }

    if (!result.success) {
      await postLog({
        level: 'warn',
        message: 'Failed to fetch notifications',
        package: 'api',
        data: {
          requestId: req.id,
          error: result.error,
          type: notification_type
        }
      });

      return res.status(500).json({
        success: false,
        error: result.error,
        notifications: [],
        stats: {}
      });
    }

    // Pagination
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginatedNotifications = result.notifications.slice(start, start + parseInt(limit));

    await postLog({
      level: 'info',
      message: 'Notifications retrieved',
      package: 'api',
      data: {
        requestId: req.id,
        count: paginatedNotifications.length,
        type: notification_type,
        cached: result.cached
      }
    });

    res.status(200).json({
      success: true,
      notifications: paginatedNotifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.notifications.length
      },
      stats: result.stats,
      cached: result.cached,
      cacheAge: result.cacheAge || null
    });
  } catch (error) {
    await postLog({
      level: 'error',
      message: 'API error fetching notifications',
      package: 'api',
      data: { requestId: req.id, error: error.message },
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      requestId: req.id
    });
  }
});

/**
 * GET /api/notifications/top
 * Get top N notifications (direct, no pagination)
 * 
 * Query params:
 * - limit: int (default: 10)
 * - cache: boolean (default: true)
 */
app.get('/api/notifications/top', async (req, res) => {
  try {
    const { limit = 10, cache = 'true' } = req.query;
    const useCache = cache !== 'false';

    const result = await notificationService.getTopNotifications(useCache);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
        notifications: []
      });
    }

    const topNotifications = result.notifications.slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      notifications: topNotifications,
      count: topNotifications.length,
      stats: result.stats,
      cached: result.cached
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      requestId: req.id
    });
  }
});

/**
 * GET /api/notifications/type/:type
 * Get notifications filtered by type
 * 
 * Path params:
 * - type: string (Placement, Result, Event)
 * 
 * Query params:
 * - limit: int (default: 10)
 */
app.get('/api/notifications/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 10 } = req.query;

    const result = await notificationService.getNotificationsByType(type);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
        notifications: []
      });
    }

    const filtered = result.notifications.slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      type,
      notifications: filtered,
      count: filtered.length,
      total: result.filteredCount,
      stats: result.stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      requestId: req.id
    });
  }
});

/**
 * GET /api/stats
 * Get notification statistics
 */
app.get('/api/stats', (req, res) => {
  try {
    const stats = notificationService.getStatistics();

    res.status(200).json({
      success: true,
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/cache/clear
 * Clear the notification cache
 */
app.post('/api/cache/clear', async (req, res) => {
  try {
    notificationService.clearCache();

    await postLog({
      level: 'info',
      message: 'Cache cleared',
      package: 'api',
      data: { requestId: req.id }
    });

    res.status(200).json({
      success: true,
      message: 'Cache cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/metrics
 * Get service metrics
 */
app.get('/api/metrics', (req, res) => {
  res.status(200).json({
    service: 'notification-app-be',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  postLog({
    level: 'error',
    message: 'Unhandled server error',
    package: 'api',
    data: { requestId: req.id, error: err.message },
    stack: err.stack
  }).catch(console.error);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    requestId: req.id
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// Start server
app.listen(port, () => {
  console.log(`Notification backend service started on port ${port}`);
  postLog({
    level: 'info',
    message: 'Backend service started',
    package: 'api',
    data: { port, environment: process.env.NODE_ENV || 'development' }
  }).catch(console.error);
});

module.exports = app;
