# Notification Backend Service

Backend service for the Campus Notification System. Implements priority-based notification management with efficient caching and API gateway functionality.

## Features

- **Priority Queue Management**: Min-heap implementation for O(log N) operations
- **Notification Fetching**: Retry logic with exponential backoff
- **Type Filtering**: Filter notifications by Placement, Result, or Event
- **Caching**: 5-minute default cache for performance
- **API Gateway**: Express-based REST API
- **Integrated Logging**: Connects to logging middleware service
- **Statistics**: Real-time notification statistics

## Project Structure

```
notification_app_be/
├── src/
│   ├── index.js                      # Main Express server
│   ├── PriorityNotificationManager.js # Min-heap implementation
│   ├── NotificationService.js        # Service orchestration
│   └── api-client.js                 # External API integration
├── .env.example
├── package.json
└── README.md
```

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd notification_app_be
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update `.env` with your settings:
```
PORT=3000
EXTERNAL_API_BASE=http://4.224.186.213/evaluation-service
BEARER_TOKEN=your_token_here
LOGGING_SERVICE_URL=http://localhost:3001/logs
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

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "notification-app-be",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600.5
}
```

### GET /api/notifications
Fetch top priority notifications with optional pagination.

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 10)
- `notification_type` (string): Filter by type (Placement, Result, Event)
- `cache` (boolean): Use cache (default: true)

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notif-123",
      "title": "Placement Offer",
      "message": "You have received a placement offer",
      "type": "Placement",
      "timestamp": "2024-01-15T10:30:00Z",
      "read": false,
      "priority": 3,
      "metadata": {
        "source": "api",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  },
  "stats": {
    "total": 10,
    "placement": 3,
    "result": 4,
    "event": 3
  },
  "cached": true,
  "cacheAge": 12000
}
```

### GET /api/notifications/top
Get top N notifications directly (no pagination).

**Query Parameters:**
- `limit` (int): Number of notifications (default: 10)
- `cache` (boolean): Use cache (default: true)

**Response:**
```json
{
  "success": true,
  "notifications": [...],
  "count": 10,
  "stats": {...},
  "cached": true
}
```

### GET /api/notifications/type/:type
Get notifications filtered by type.

**Path Parameters:**
- `type` (string): Notification type (Placement, Result, Event)

**Query Parameters:**
- `limit` (int): Number of notifications (default: 10)

**Response:**
```json
{
  "success": true,
  "type": "Placement",
  "notifications": [...],
  "count": 5,
  "total": 5,
  "stats": {...}
}
```

### GET /api/stats
Get notification statistics.

**Response:**
```json
{
  "success": true,
  "cached": true,
  "cacheAge": 12000,
  "stats": {
    "total": 10,
    "placement": 3,
    "result": 4,
    "event": 3
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### POST /api/cache/clear
Clear the notification cache.

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared"
}
```

### GET /api/metrics
Get service metrics.

**Response:**
```json
{
  "service": "notification-app-be",
  "uptime": 3600.5,
  "memory": {
    "rss": 52428800,
    "heapTotal": 20971520,
    "heapUsed": 10485760,
    "external": 1048576,
    "arrayBuffers": 0
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Priority Rules

Notifications are ordered by:

1. **Priority Level** (descending):
   - Placement: 3
   - Result: 2
   - Event: 1

2. **Timestamp** (newer first):
   - Newer notifications appear before older ones

3. **Notification ID** (lexicographic):
   - Used as final tie-breaker

## Performance

- **Insertion**: O(log N)
- **Extraction**: O(log N)
- **Peek**: O(1)
- **Efficiency**: 75% gain vs. sorting entire dataset

### Example Performance (10,000 items):
- Min-heap approach: ~33,219 operations
- Full sort approach: ~132,877 operations

## Caching

- Default cache timeout: 5 minutes
- Cache automatically invalidates after timeout
- Use `cache=false` query param to bypass cache
- POST `/api/cache/clear` to manually clear cache

## Error Handling

All API errors return standardized response:
```json
{
  "success": false,
  "error": "Error message",
  "requestId": "unique-request-id"
}
```

## Logging

All operations are logged to the logging middleware service:
- API requests and responses
- Error events with stack traces
- Cache operations
- Service metrics

## Integration

### With Frontend (notification_app_fe)

Frontend can call backend directly or through its own proxy:

```javascript
// Option 1: Direct call to backend
const response = await fetch('http://localhost:3000/api/notifications');
const data = await response.json();

// Option 2: Through frontend proxy
const response = await fetch('/api/notifications');
const data = await response.json();
```

### With Logging Middleware (logging_middleware)

Backend automatically sends logs to the logging service:

```javascript
// Configured in .env
LOGGING_SERVICE_URL=http://localhost:3001/logs
```

## Troubleshooting

### Service won't start
- Check if port 3000 is already in use: `netstat -tulpn | grep 3000`
- Verify Node.js version: `node --version` (requires 18+)

### Notifications not fetching
- Verify EXTERNAL_API_BASE is correct
- Check BEARER_TOKEN is valid
- Ensure logging service is running (if required)

### High memory usage
- Check cache settings
- Monitor with: `curl http://localhost:3000/api/metrics`
- Clear cache: `curl -X POST http://localhost:3000/api/cache/clear`

## Development

### Run tests
```bash
npm test
```

### Lint code
```bash
npm run lint
```

## License

MIT
