# Campus Notification System - Frontend

A Next.js + React + Material UI application for displaying and prioritizing campus notifications.

## Features

### Stage 1: Priority Logic
- Min-heap based priority management (O(log N) insertion)
- Unread notification filtering
- Duplicate detection and prevention
- Priority ordering: Placement > Result > Event
- Timestamp-based sorting within same type
- Comprehensive error handling and retry logic
- Structured logging integration

### Stage 2: Frontend UI
- **Home Page (/)**: Dashboard with notification summary and all notifications
- **Priority Page (/priority)**: Top 10 prioritized notifications with type filtering
- Material UI components with responsive design
- Error handling with retry functionality
- Loading states with skeleton UI
- Custom `useNotifications` hook for data management

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **UI Library**: Material UI v5
- **Styling**: Emotion (CSS-in-JS)
- **HTTP Client**: Axios
- **JavaScript**: ES6+ (no TypeScript)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── notifications/route.js    # Proxy API for notifications
│   │   └── logs/route.js             # Proxy API for logs
│   ├── layout.js                     # Root layout
│   ├── page.js                       # Home page
│   ├── priority/page.js              # Priority notifications page
│   ├── providers/
│   │   └── mui-theme.js              # Material UI theme provider
│   └── utils/
│       ├── notification-types.js     # Type constants and helpers
│       └── time-format.js            # Date formatting utilities
├── components/
│   ├── AppShell.jsx                  # Main layout shell with navigation
│   ├── NotificationCard.jsx          # Single notification display
│   ├── DashboardSummary.jsx          # Summary statistics cards
│   ├── ErrorBanner.jsx               # Error alert component
│   └── LoadingState.jsx              # Loading skeleton
├── hooks/
│   └── useNotifications.js           # Custom hook for notification data
└── services/
    ├── api.js                        # Axios client configuration
    ├── auth.js                       # Authentication token management
    ├── logger.js                     # Structured logging utility
    ├── NotificationService.js        # API service with retry logic
    └── PriorityNotificationManager.js # Priority queue implementation
```

## Setup & Installation

### Prerequisites
- Node.js 18+ (with npm)
- Environment variables configured

### Environment Variables

Create `.env.local` in the root directory:

```
NEXT_PUBLIC_TOKEN=<your-api-token>
EVALUATION_EMAIL=<email>
EVALUATION_NAME=<name>
EVALUATION_ROLL_NO=<roll-number>
EVALUATION_ACCESS_CODE=<access-code>
EVALUATION_CLIENT_ID=<client-id>
EVALUATION_CLIENT_SECRET=<client-secret>
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open in browser
# http://localhost:3000
```

## Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## API Integration

### External API Base URL
```
http://4.224.186.213/evaluation-service
```

### Endpoints

**Fetch Notifications:**
```
GET /notifications?page=1&limit=20&notification_type=Placement
```

Query Parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `notification_type`: Filter by type (Event, Result, Placement)

**Post Logs:**
```
POST /logs
```

Request Body:
```json
{
  "stack": "frontend",
  "level": "info",
  "package": "notification_app_fe",
  "event": "event_name",
  "timestamp": "2026-04-22T17:51:18.000Z",
  "details": {}
}
```

## Notification Structure

```json
{
  "ID": "uuid",
  "Type": "Placement" | "Event" | "Result",
  "Message": "text",
  "Timestamp": "yyyy-mm-dd hh:mm:ss"
}
```

## Key Components

### useNotifications Hook
```javascript
const { 
  notifications,    // Array of notifications
  isLoading,        // Loading state
  error,            // Error message
  refetch,          // Manual refetch function
  stats,            // Statistics object
  summary           // Computed summary counts
} = useNotifications({
  page: 1,
  limit: 100,
  topN: 10,
  notificationType: ""
});
```

### PriorityNotificationManager
- Maintains top N notifications using min-heap
- O(log N) insertion time
- Filters unread notifications only
- Tracks statistics and logs events

### NotificationService
- Fetches notifications from API
- Implements retry logic with exponential backoff
- Processes notifications through priority manager
- Comprehensive error handling and logging

## Design & Architecture

See [Notification_System_Design.md](./Notification_System_Design.md) for:
- Detailed problem statement
- Priority logic explanation
- Data structure analysis
- Time complexity discussion
- Scalability considerations
- Fault tolerance strategy
- Logging strategy
- Future improvements

## Code Quality

- ✅ Production-ready code
- ✅ No unused imports
- ✅ No dead code
- ✅ No TODO comments
- ✅ Defensive rendering
- ✅ Comprehensive error handling
- ✅ ESLint compliant
- ✅ Follows Next.js conventions

## Performance

### Priority Queue Efficiency
- **Insertion**: O(log N) per notification
- **Top N Retrieval**: O(N)
- **Space Complexity**: O(N) where N = topN size

### Example: 10,000 Notifications
- Min Heap: ~33,219 comparisons
- Sorting approach: ~132,877 comparisons
- **Efficiency gain: 75% reduction**

## Logging

All events are logged with structured logs including:
- API requests (started, completed, failed)
- Notification processing (accepted, rejected)
- Priority updates
- Error handling

Logs can be monitored and analyzed for debugging and monitoring.

## Support

For issues or questions, refer to:
1. [Notification_System_Design.md](./Notification_System_Design.md) - Architecture details
2. Code comments in key services
3. Component prop documentation

## License

Internal Use Only - Campus Hiring Evaluation
