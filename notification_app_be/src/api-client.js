/**
 * External API Client
 * 
 * Handles communication with external notification service.
 * Includes retry logic and error handling.
 */

const axios = require('axios');

const EXTERNAL_API_BASE = process.env.EXTERNAL_API_BASE || 'http://4.224.186.213/evaluation-service';
const BEARER_TOKEN = process.env.BEARER_TOKEN || '';
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES) || 2;

/**
 * Create axios client with external API configuration
 */
const externalApiClient = axios.create({
  baseURL: EXTERNAL_API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${BEARER_TOKEN}`
  }
});

/**
 * Fetch notifications with retry logic
 */
async function fetchNotificationsWithRetry(params = {}, retryCount = 0) {
  try {
    const response = await externalApiClient.get('/notifications', { params });
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      // Exponential backoff: 500ms, 1000ms, 1500ms
      const delay = (retryCount + 1) * 500;
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchNotificationsWithRetry(params, retryCount + 1);
    }

    return {
      success: false,
      error: error.message,
      status: error.response?.status || 500,
      data: null
    };
  }
}

/**
 * Post logs to logging service
 */
async function postLog(logEntry) {
  try {
    const loggingServiceUrl = process.env.LOGGING_SERVICE_URL || 'http://localhost:3001/logs';
    const response = await axios.post(loggingServiceUrl, {
      level: logEntry.level || 'info',
      message: logEntry.message,
      package: logEntry.package || 'service',
      timestamp: logEntry.timestamp || new Date().toISOString(),
      data: logEntry.data || {},
      stack: logEntry.stack || undefined
    });
    return response.status === 202;
  } catch (error) {
    console.error('Failed to post log:', error.message);
    return false;
  }
}

module.exports = {
  externalApiClient,
  fetchNotificationsWithRetry,
  postLog
};
