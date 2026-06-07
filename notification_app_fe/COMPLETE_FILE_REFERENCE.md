# Complete File Reference - Campus Notification System

## Overview

This document provides a complete reference of all files in the notification system project, their purpose, and key contents.

---

## Root Level Configuration Files

### `package.json`
**Purpose:** Project metadata and dependencies

**Key Dependencies:**
- `next@14.0.0` - React framework with App Router
- `@mui/material@5.14.1` - Material UI components
- `@mui/icons-material@5.14.1` - Material UI icons
- `axios@1.5.0` - HTTP client
- `@emotion/react@11.11.1` - CSS-in-JS
- `react@18.2.0` - React library
- `react-dom@18.2.0` - React DOM

**Scripts:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

---

### `next.config.js`
**Purpose:** Next.js configuration

**Settings:**
- React Strict Mode: enabled
- SWC Minify: enabled
- Console removal in production

---

### `jsconfig.json`
**Purpose:** JavaScript project configuration and path aliases

**Key Settings:**
- Base URL: "."
- Path Alias: `@/*` → `./src/*`
- Allows JavaScript files
- Module resolution: node

---

### `.eslintrc.json`
**Purpose:** Code linting configuration

**Configuration:**
- Extends: `next/core-web-vitals`
- Enforces Next.js best practices

---

### `.env.local`
**Purpose:** Environment variables (local development)

**Variables:**
- `NEXT_PUBLIC_TOKEN` - API authentication token
- `EVALUATION_EMAIL` - Evaluation email
- `EVALUATION_NAME` - Evaluator name
- `EVALUATION_ROLL_NO` - Roll number
- `EVALUATION_ACCESS_CODE` - Access code
- `EVALUATION_CLIENT_ID` - Client ID
- `EVALUATION_CLIENT_SECRET` - Client secret

⚠️ **NOTE:** Never commit this file to version control

---

### `.gitignore`
**Purpose:** Git exclusions

**Excludes:**
- `node_modules/` - Dependencies
- `.next/` - Build output
- `node/`, `build/` - Generated files
- `.env` files - Environment variables
- Editor configs - `.vscode/`, `.idea/`
- OS files - `.DS_Store`, `Thumbs.db`

---

## Documentation Files

### `README.md`
**Purpose:** Complete project documentation

**Contains:**
- Project overview and features
- Technology stack
- Project structure
- Setup and installation steps
- API integration guide
- Component documentation
- Design references
- Performance metrics

---

### `Notification_System_Design.md`
**Purpose:** Comprehensive architecture and design documentation

**Sections:**
- **Stage 1:** Priority logic and min-heap implementation
  - Problem statement
  - Priority rules (Placement > Result > Event)
  - Data structures (Min Heap, Set, Stats)
  - Time complexity analysis (O(log N) insertion, O(N) retrieval)
  - Scalability discussion (75% efficiency gain)
  - Fault tolerance strategy
  - Logging strategy
  
- **Stage 2:** Frontend UI implementation
  - Architecture overview
  - Key features
  - Component descriptions
  - API layer design
  - Theme configuration
  - Error handling

- **Future Improvements:**
  - Caching and memoization
  - WebSocket integration
  - Distributed processing
  - Advanced filtering
  - Analytics
  - Performance optimization

---

### `IMPLEMENTATION_SUMMARY.md`
**Purpose:** High-level summary of implementation

**Contains:**
- Completion status (100%)
- Files created and modified
- Architecture overview
- Key features checklist
- Code quality metrics
- File manifest
- Setup instructions
- Deployment checklist

---

### `QUICK_START.md`
**Purpose:** Fast setup guide for developers

**Contains:**
- 5-minute setup steps
- Troubleshooting tips
- Available commands
- Key files reference
- Next steps

---

## Application Code Structure

### `src/app/layout.js`
**Purpose:** Root layout component for the entire application

**Features:**
- Integrates Material UI theme provider
- Wraps children with AppShell
- Sets up CssBaseline for consistent styling
- Configures document head metadata

**Metadata:**
```javascript
{
  title: "Notification App",
  description: "Campus Notification System - Stage 1 & 2"
}
```

---

### `src/app/page.js` (Home Page)
**Purpose:** Home page displaying dashboard with all notifications

**Features:**
- Dashboard summary cards showing counts
- All notifications in list
- Loading states with skeleton UI
- Error banner with retry button
- Empty state message
- Responsive layout

**State:**
- `notifications` - Array of all notifications
- `isLoading` - Loading state
- `error` - Error message if any
- `summary` - Computed counts (Total, Event, Result, Placement)

---

### `src/app/priority/page.js` (Priority Page)
**Purpose:** Display top 10 prioritized notifications with filtering

**Features:**
- Dropdown filter by notification type
- Real-time filtering on selection
- Shows top 10 unread notifications
- Priority ordering: Placement > Result > Event
- Loading and error states
- Retry button

**Filter Options:**
- All Types (default)
- Placement
- Result
- Event

---

### `src/app/api/notifications/route.js`
**Purpose:** Backend proxy endpoint for notifications

**HTTP Method:** GET

**Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `notification_type` - Filter by type (optional)

**Features:**
- Proxies to external API
- Adds Bearer token authentication
- Normalizes query parameters
- Error handling with proper status codes
- Cache-control headers

---

### `src/app/api/logs/route.js`
**Purpose:** Backend proxy endpoint for structured logging

**HTTP Method:** POST

**Features:**
- Proxies to external API
- Normalizes log payload
- Adds timestamp if missing
- Bearer token authentication
- Validates required fields
- Error handling

---

### `src/app/providers/mui-theme.js`
**Purpose:** Material UI theme provider and configuration

**Theme Configuration:**
```javascript
{
  palette: {
    primary: { main: "#2952cc" },      // Professional blue
    secondary: { main: "#0f766e" },    // Teal
    background: {
      default: "#f6f7fb",              // Light gray
      paper: "#ffffff"                 // White
    },
    text: {
      primary: "#172033",              // Dark gray
      secondary: "#667085"             // Medium gray
    }
  },
  shape: { borderRadius: 8 },
  typography: { fontFamily: "Geist Sans" }
}
```

**Component Overrides:**
- MuiCard: Custom border and shadow styling

---

### `src/app/utils/notification-types.js`
**Purpose:** Notification type constants and utilities

**Constants:**
```javascript
NOTIFICATION_PRIORITY = {
  Event: 1,      // Lowest priority
  Result: 2,     // Medium priority
  Placement: 3   // Highest priority
}

SUPPORTED_NOTIFICATION_TYPES = ["Event", "Result", "Placement"]
```

**Functions:**
- `normalizeNotificationType()` - Sanitize type input
- `getNotificationType()` - Extract type from notification object

---

### `src/app/utils/time-format.js`
**Purpose:** Date and time formatting utilities

**Functions:**
- `formatNotificationTimestamp()` - Format timestamp for display
  - Handles multiple input formats
  - Uses Intl.DateTimeFormat for localization
  - Returns "-" for invalid dates

**Output Format:**
```
"Apr 22, 2026, 17:51"
```

---

## React Components

### `src/components/AppShell.jsx`
**Purpose:** Main layout wrapper with navigation

**Features:**
- Top navigation bar (AppBar)
- Navigation links (Home, Priority)
- Active link highlighting
- Responsive container
- Navigation Icons:
  - Home: HomeIcon
  - Priority: PriorityHighIcon

**Props:**
- `children` - Content to display

---

### `src/components/NotificationCard.jsx`
**Purpose:** Single notification display card

**Features:**
- Material UI Card component
- Displays notification type as chip
- Shows message and timestamp
- Access time icon
- Responsive layout (column on mobile, row on desktop)
- Defensive rendering with fallbacks

**Fallback Field Names:**
- Title: title, Title, subject, heading, notification_title
- Message: message, Message, description, body, content
- Timestamp: timestamp, Timestamp, created_at, createdAt, date

---

### `src/components/DashboardSummary.jsx`
**Purpose:** Summary statistics cards

**Cards:**
1. Total - Total notification count
2. Events - Event notification count
3. Results - Result notification count
4. Placements - Placement notification count

**Features:**
- Responsive grid:
  - xs: 12 (full width on mobile)
  - sm: 6 (2 columns on small devices)
  - md: 3 (4 columns on desktop)
- Loading skeleton during fetch
- Clean typography hierarchy

---

### `src/components/ErrorBanner.jsx`
**Purpose:** Error alert with retry functionality

**Features:**
- Material UI Alert component
- Error severity styling
- Retry button with refresh icon
- Calls `onRetry` callback when clicked
- Conditional rendering of retry button

---

### `src/components/LoadingState.jsx`
**Purpose:** Loading skeleton UI

**Features:**
- 3-item skeleton grid
- Simulates card layout
- Provides visual feedback during data fetch
- Smooth loading experience

---

## Custom Hooks

### `src/hooks/useNotifications.js`
**Purpose:** Custom React hook for managing notification data

**State:**
- `notifications` - Array of loaded notifications
- `isLoading` - Boolean for loading state
- `error` - Error message if fetch failed
- `stats` - Statistics from priority manager
- `summary` - Computed summary counts

**Functions:**
- `refetch()` - Manual refetch function

**Parameters:**
```javascript
{
  page: 1,                    // Page number
  limit: 100,                 // Items per page
  topN: 10,                   // Top N to keep
  notificationType: ""        // Filter by type
}
```

**Features:**
- Automatic cleanup on unmount
- Deduplication of requests
- Automatic retry on mount
- Revalidation on dependency changes
- Manager instance caching

---

## Services

### `src/services/api.js`
**Purpose:** Axios client configuration and utilities

**Constants:**
- `API_BASE_URL` - External API base URL
- `externalApiClient` - Axios instance for external API
- `apiClient` - Axios instance for backend proxy

**Functions:**
- `normalizeNotificationResponse()` - Extract notifications from response
- `fetchNotifications()` - Fetch notifications with parameters
- `postLog()` - Submit structured log

---

### `src/services/logger.js`
**Purpose:** Structured logging utility

**Class:** `StructuredLogger`
- `constructor(transport, context)` - Initialize logger
- `log(level, event, details)` - Log an event
- `info(event, details)` - Info level log
- `warn(event, details)` - Warning level log
- `error(event, details)` - Error level log

**Functions:**
- `logClientEvent()` - Convenience function to log events
- `toErrorMessage()` - Extract error message from response

**Default Context:**
```javascript
{
  service: "notification_app_fe",
  stage: "stage_1"
}
```

---

### `src/services/NotificationService.js`
**Purpose:** API service with retry logic and integration with priority manager

**Class:** `NotificationService`

**Methods:**
- `fetchNotifications()` - Fetch notifications from API
- `fetchNotificationsWithRetry()` - Fetch with exponential backoff
- `getTopUnreadNotifications()` - Get top N unread notifications

**Retry Configuration:**
- Default retry count: 2
- Default delay: 500ms
- Exponential backoff multiplier

**Logging:**
- Logs API request start, completion, and failures
- Logs retry attempts with timing
- Integrates with PriorityNotificationManager

---

### `src/services/PriorityNotificationManager.js`
**Purpose:** Priority queue implementation using min-heap

**Data Structures:**
- **MinHeap** - Binary heap for maintaining top N
  - `push(item)` - Insert with O(log N)
  - `pop()` - Remove min with O(log N)
  - `replaceRoot(item)` - Replace min with O(log N)
  - `peek()` - Get min with O(1)
  - `toArray()` - Get all items

**Normalization:**
- Validates all required fields (ID, Type, Message, Timestamp)
- Handles multiple field name variations
- Normalizes notification types
- Parses timestamps with multiple formats
- Detects unread status

**Processing:**
- Deduplication using Set
- Read status filtering (unread only)
- Priority comparison using min-heap
- Statistics tracking
- Event logging

**Methods:**
- `processNotifications(batch)` - Process array of notifications
- `processNotification(item)` - Process single notification
- `getTopNotifications()` - Get sorted top N
- `getStats()` - Get statistics object

---

### `src/services/auth.js`
**Purpose:** Authentication token management

**Functions:**
- `getAccessToken()` - Get current access token (with caching)
- `clearCachedAccessToken()` - Clear cached token

**Features:**
- Token caching with expiry
- Automatic token refresh on expiry
- Credential configuration from environment
- Credential validation

---

## Feature Summary

### Stage 1: Priority Management ✅

| Feature | Status | Location |
|---------|--------|----------|
| Unread filtering | ✅ | PriorityNotificationManager |
| Priority ordering | ✅ | PriorityNotificationManager |
| Min-heap implementation | ✅ | PriorityNotificationManager |
| Deduplication | ✅ | PriorityNotificationManager |
| Field validation | ✅ | PriorityNotificationManager |
| Timestamp parsing | ✅ | PriorityNotificationManager |
| Error handling | ✅ | NotificationService |
| Retry logic | ✅ | NotificationService |
| Logging | ✅ | StructuredLogger |
| Statistics | ✅ | PriorityNotificationManager |

### Stage 2: Frontend UI ✅

| Feature | Status | Location |
|---------|--------|----------|
| Home page | ✅ | src/app/page.js |
| Priority page | ✅ | src/app/priority/page.js |
| AppShell/Navigation | ✅ | AppShell.jsx |
| Notification cards | ✅ | NotificationCard.jsx |
| Summary cards | ✅ | DashboardSummary.jsx |
| Error banner | ✅ | ErrorBanner.jsx |
| Loading state | ✅ | LoadingState.jsx |
| Type filtering | ✅ | Priority page |
| Responsive design | ✅ | All components |
| Material UI theme | ✅ | mui-theme.js |
| Custom hook | ✅ | useNotifications.js |
| API integration | ✅ | api.js, routes |
| Error handling | ✅ | All components |

---

## Build & Deployment

### Development
```bash
npm install
npm run dev
# http://localhost:3000
```

### Production
```bash
npm run build      # Build application
npm start          # Start production server
npm run lint       # Verify code quality
```

### Validation Checklist
- ✅ `npm run build` passes
- ✅ `npm run lint` passes
- ✅ `npm run dev` runs successfully
- ✅ No console errors in browser
- ✅ API calls work with valid token
- ✅ Pages load and render correctly
- ✅ Responsive design works on mobile

---

## Time Complexity Summary

| Operation | Complexity | Location |
|-----------|-----------|----------|
| Insert notification | O(log N) | MinHeap.push |
| Remove notification | O(log N) | MinHeap.pop |
| Peek min item | O(1) | MinHeap.peek |
| Check duplicate | O(1) average | Set lookup |
| Get top N sorted | O(N log N) | getTopNotifications |
| Process batch of M items | O(M log N) | processNotifications |

---

## Conclusion

All files are production-ready with:
- ✅ Clean architecture
- ✅ Proper error handling
- ✅ Comprehensive logging
- ✅ Responsive UI
- ✅ Efficient algorithms
- ✅ Complete documentation

Ready for deployment and evaluation.
