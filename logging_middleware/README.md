# Logging Middleware Service

Centralized structured logging service for the Campus Notification System. Provides non-blocking, organized logging with support for multiple log levels and package types.

## Features

- **Structured JSON Logging**: All logs are in consistent JSON format with metadata
- **Multiple Log Levels**: debug, info, warn, error, fatal
- **Package Organization**: api, component, hook, page, state, service
- **Daily Rotating Files**: Automatic log rotation and archival
- **Non-blocking Operations**: Logging doesn't block request processing
- **Request Tracking**: Unique request IDs for tracing
- **Health Checks**: Endpoints for monitoring service health
- **Batch Logging**: Support for submitting multiple logs at once

## Project Structure

```
logging_middleware/
├── src/
│   └── index.js           # Main service implementation
├── logs/                  # Log files (auto-created)
├── package.json
├── .env.example
└── README.md
```

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd logging_middleware
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update `.env` with your settings:
```
PORT=3001
LOG_LEVEL=info
NODE_ENV=development
```

## Usage

### Start the service
```bash
npm start
```

### Development with auto-reload
```bash
npm run dev
```

## API Endpoints

### POST /logs
Submit a structured log entry.

**Request:**
```json
{
  "level": "info",
  "message": "User logged in",
  "package": "api",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "userId": "user123",
    "ip": "192.168.1.1"
  },
  "requestId": "optional-request-id"
}
```

**Response:** (202 Accepted)
```json
{
  "success": true,
  "message": "Log received",
  "id": "request-tracking-id"
}
```

### POST /logs/batch
Submit multiple log entries at once.

**Request:**
```json
{
  "logs": [
    {
      "level": "info",
      "message": "Event 1",
      "package": "component",
      "data": { "componentId": "comp1" }
    },
    {
      "level": "warn",
      "message": "Event 2",
      "package": "service",
      "data": { "serviceId": "svc1" }
    }
  ]
}
```

**Response:** (202 Accepted)
```json
{
  "success": true,
  "message": "Received 2 logs",
  "processed": 2,
  "failed": 0
}
```

### GET /logs/health
Check if the logging service is running.

**Response:**
```json
{
  "status": "healthy",
  "service": "logging-middleware",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600.5
}
```

### GET /logs/stats
Get logging service statistics.

**Response:**
```json
{
  "service": "logging-middleware",
  "uptime": 3600.5,
  "memory": {
    "rss": 52428800,
    "heapTotal": 20971520,
    "heapUsed": 10485760,
    "external": 1048576,
    "arrayBuffers": 0
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "logPath": "/path/to/logs"
}
```

## Log Levels

- **debug**: Detailed debugging information
- **info**: Informational messages
- **warn**: Warning messages
- **error**: Error messages with stack traces
- **fatal**: Critical/fatal errors

## Package Types

Organize logs by source:
- **api**: API requests and responses
- **component**: React component operations
- **hook**: React hook operations
- **page**: Page/route operations
- **state**: State management operations
- **service**: Service/utility operations

## Log Files

Logs are stored in the `logs/` directory:
- `combined-YYYY-MM-DD.log` - All logs
- `error-YYYY-MM-DD.log` - Errors only
- Files older than 30 days are automatically removed

## Integration

### With Frontend (notification_app_fe)

The frontend logger service already sends logs to this middleware:

```javascript
import logger from './services/logger';

// Example: Logging an event
logger.info('Notification fetched', {
  count: 10,
  duration: 245,
  package: 'service'
});
```

### With Backend (notification_app_be)

The backend service uses this for centralized logging:

```javascript
const axios = require('axios');

async function logEvent(level, message, data) {
  try {
    await axios.post('http://localhost:3001/logs', {
      level,
      message,
      package: 'api',
      data
    });
  } catch (error) {
    console.error('Failed to send log', error.message);
  }
}
```

## Performance

- Non-blocking design: Logs are processed asynchronously
- Response time: < 5ms for log submission
- Batch support: Submit up to 100+ logs in single request
- File rotation: Prevents log files from growing too large

## Monitoring

Monitor the service health:

```bash
curl http://localhost:3001/logs/health
curl http://localhost:3001/logs/stats
```

## Troubleshooting

### Service won't start
- Check if port 3001 is already in use: `lsof -i :3001`
- Verify Node.js is installed: `node --version`

### Logs not being written
- Check permissions on logs directory
- Verify LOG_DIR path is valid

### Memory issues
- Check memory usage: `curl http://localhost:3001/logs/stats`
- Rotate logs more frequently by adjusting maxDays in winston config

## License

MIT
