/**
 * Centralized Logging Middleware Service
 * 
 * Provides structured logging for all components of the Campus Notification System.
 * Supports multiple log levels, packages, and async operations.
 * 
 * Features:
 * - Structured JSON logging
 * - Multiple log levels (debug, info, warn, error, fatal)
 * - Package-based organization (api, component, hook, page, state, service)
 * - Daily rotating file logs
 * - Non-blocking operations
 * - HTTP API for remote logging
 * - Request/Response tracking
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const winston = require('winston');
require('winston-daily-rotate-file');
require('dotenv').config();

const port = process.env.PORT || 3001;

// Configure Winston Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'logging-middleware' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `[${timestamp}] ${level}: ${message} ${metaStr}`;
        })
      )
    }),
    // Daily rotating file for errors
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxDays: '14d'
    }),
    // Daily rotating file for all logs
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxDays: '30d'
    })
  ]
});

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Request tracking middleware
app.use((req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.startTime = Date.now();
  
  // Log incoming request
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Log response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - req.startTime;
    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`
    });
    return originalSend.call(this, data);
  };

  next();
});

/**
 * Log Levels:
 * - debug: Detailed debugging information
 * - info: Informational messages
 * - warn: Warning messages
 * - error: Error messages
 * - fatal: Fatal/critical errors
 * 
 * Packages:
 * - api: API layer logs
 * - component: React component logs
 * - hook: React hook logs
 * - page: Page/route logs
 * - state: State management logs
 * - service: Service/utility logs
 */

/**
 * POST /logs
 * Log a structured event
 * 
 * Request body:
 * {
 *   level: 'info|warn|error|debug|fatal',
 *   message: string,
 *   package: 'api|component|hook|page|state|service',
 *   timestamp: ISO8601 string,
 *   stack?: string,
 *   data?: object,
 *   requestId?: string
 * }
 */
app.post('/logs', (req, res) => {
  try {
    const {
      level = 'info',
      message = 'No message provided',
      package: pkg = 'unknown',
      timestamp,
      stack,
      data = {},
      requestId
    } = req.body;

    // Validate level
    const validLevels = ['debug', 'info', 'warn', 'error', 'fatal'];
    const logLevel = validLevels.includes(level) ? level : 'info';

    // Validate package
    const validPackages = ['api', 'component', 'hook', 'page', 'state', 'service', 'unknown'];
    const logPackage = validPackages.includes(pkg) ? pkg : 'unknown';

    // Create structured log
    const logEntry = {
      level: logLevel,
      message,
      package: logPackage,
      timestamp: timestamp || new Date().toISOString(),
      requestId: requestId || req.id,
      sourceIp: req.ip,
      ...data
    };

    // Add stack trace if provided
    if (stack) {
      logEntry.stack = stack;
    }

    // Log using winston
    logger.log(logLevel, message, logEntry);

    // Respond immediately (non-blocking)
    res.status(202).json({
      success: true,
      message: 'Log received',
      id: req.id
    });
  } catch (error) {
    logger.error('Error processing log', {
      requestId: req.id,
      error: error.message,
      stack: error.stack
    });
    res.status(400).json({
      success: false,
      message: 'Error processing log',
      error: error.message
    });
  }
});

/**
 * POST /logs/batch
 * Log multiple events in batch
 * 
 * Request body:
 * {
 *   logs: Array<LogEntry>
 * }
 */
app.post('/logs/batch', (req, res) => {
  try {
    const { logs = [] } = req.body;

    if (!Array.isArray(logs)) {
      return res.status(400).json({
        success: false,
        message: 'logs must be an array'
      });
    }

    let successCount = 0;
    logs.forEach((logEntry) => {
      try {
        const {
          level = 'info',
          message = 'No message',
          package: pkg = 'unknown',
          timestamp,
          data = {}
        } = logEntry;

        const validLevels = ['debug', 'info', 'warn', 'error', 'fatal'];
        const logLevel = validLevels.includes(level) ? level : 'info';

        logger.log(logLevel, message, {
          package: pkg,
          timestamp: timestamp || new Date().toISOString(),
          requestId: req.id,
          ...data
        });

        successCount++;
      } catch (err) {
        // Continue with next log if one fails
        logger.error('Error in batch log entry', {
          requestId: req.id,
          error: err.message
        });
      }
    });

    res.status(202).json({
      success: true,
      message: `Received ${logs.length} logs`,
      processed: successCount,
      failed: logs.length - successCount
    });
  } catch (error) {
    logger.error('Error processing batch logs', {
      requestId: req.id,
      error: error.message
    });
    res.status(400).json({
      success: false,
      message: 'Error processing batch logs',
      error: error.message
    });
  }
});

/**
 * GET /logs/health
 * Health check endpoint
 */
app.get('/logs/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'logging-middleware',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET /logs/stats
 * Get logging statistics
 */
app.get('/logs/stats', (req, res) => {
  res.status(200).json({
    service: 'logging-middleware',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    logPath: process.cwd() + '/logs'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    requestId: req.id,
    error: err.message,
    stack: err.stack,
    url: req.originalUrl
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    requestId: req.id
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', {
    requestId: req.id,
    method: req.method,
    path: req.path
  });

  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Start server
app.listen(port, () => {
  logger.info(`Logging middleware service started on port ${port}`, {
    port,
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = app;
