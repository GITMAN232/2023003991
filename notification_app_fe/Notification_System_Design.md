# Notification System Design - Stage 1 & 2

## Stage 1: Priority-Based Notification Fetching

### Problem Statement

The campus notification system needs to handle a continuous stream of notifications from multiple sources (Placement, Result, Event) and efficiently maintain a set of the top N highest-priority unread notifications. The system must:

1. Fetch notifications from an external evaluation service API
2. Filter and prioritize unread notifications only
3. Maintain the top N notifications based on priority rules
4. Handle API failures gracefully with retry logic
5. Avoid reprocessing the entire dataset when new notifications arrive
6. Support configurable N (number of top notifications to track)
7. Provide extensive logging for observability

### Priority Logic

**Priority Order (Highest to Lowest):**
- **Placement**: Priority = 3
- **Result**: Priority = 2
- **Event**: Priority = 1

**Tie-breaking (within same type):**
- Newer notifications rank higher
- Timestamp is used for ordering (descending)
- ID is used as final tie-breaker (lexicographic comparison)

### Data Structures Used

#### Min Heap (Priority Queue)

**Why Min Heap?**
- O(log N) insertion time: New notifications are added efficiently
- O(log N) replacement time: When heap is full, the lowest-priority item can be replaced in logarithmic time
- O(1) peek operation: Quick access to the lowest-priority item for comparison
- Space complexity: O(N) where N is the number of top notifications to maintain
- No need for sorting: The heap naturally maintains relative priority ordering

Instead of sorting all notifications every time a new one arrives, the min heap only needs to:
1. Check if the new notification has higher priority than the min item (O(1))
2. Replace the min if necessary (O(log N))

This is vastly more efficient than sorting N items each time (O(N log N)), especially with continuous data arrival.

#### Deduplication Set

**Why Set?**
- O(1) average lookup time for duplicate detection
- Prevents processing the same notification multiple times
- Essential for streaming scenarios where the same notification might arrive twice

#### Statistics Object

Tracks:
- `processed`: Count of successfully processed notifications
- `rejected`: Count of rejected notifications
- `duplicates`: Count of duplicate detections
- `read`: Count of read notifications (excluded)
- `topNUpdates`: Count of times the top N was modified
- `retained`: Current size of the priority queue

### Time Complexity Analysis

**Notification Insertion:**
- O(log N) average case
- Where N = number of top notifications to maintain
- Operation: Insert if heap not full, or replace min if new notification has higher priority

**Top N Retrieval:**
- O(N) time: Extract all items from heap and sort by descending priority
- O(N log N) space: Temporary array for sorting
- Conversion back to user-facing format: O(N)

**Batch Processing:**
- Inserting M notifications: O(M log N)
- Where M = notifications in batch, N = topN size

### Scalability Discussion

**Continuous Arrival Pattern:**
Traditional approach (sort all data after each batch):
- Time: O(Total * log Total) - grows linearly with accumulated notifications
- Space: O(Total) - must keep all notifications

Min Heap approach:
- Time: O(Total * log N) - grows with M batches, each O(M log N)
- Space: O(N) - only keeps top N notifications
- When Total >> N, efficiency gain is significant

**Example:**
- 10,000 notifications arrive in batches of 100
- topN = 10
- Sorting approach: 10,000 * log(10,000) ≈ 132,877 comparisons total
- Min heap approach: 10,000 * log(10) ≈ 33,219 comparisons total
- **75% reduction in operations**

### Fault Tolerance

**API Failure Handling:**

1. **Immediate Retry:**
   - Exponential backoff: 500ms, 1000ms, 1500ms
   - Configurable retry count (default: 2)
   - Total max wait: ~2.5 seconds for 2 retries

2. **Partial Failures:**
   - Malformed notifications are logged and skipped
   - Valid notifications in the batch are processed
   - System continues rather than failing the entire request

3. **Duplicate Prevention:**
   - Each notification ID is tracked in a Set
   - If a notification is received twice, it's rejected
   - Prevents duplicate entries even if the API returns them

4. **Missing Fields:**
   - Validates presence of: ID, Type, Message, Timestamp
   - Logs specific missing fields
   - Notification is rejected, not added to results

### Logging Strategy

**Logged Events:**

| Event | Level | Purpose | Details |
|-------|-------|---------|---------|
| `api_request_started` | info | Request initiated | method, url, params |
| `api_request_completed` | info | Request succeeded | method, url, status, count |
| `api_request_failed` | error | Request failed | method, url, error message |
| `api_request_retry_scheduled` | warn | Retry scheduled | attempt number, delay |
| `notification_processed` | info | Valid notification accepted | id, type, timestamp |
| `notification_rejected` | warn | Notification excluded | reason, details |
| `top_n_updated` | info | Top N set changed | action, id, type |

**Logging Benefits:**

1. **Debugging:** Trace exact flow of notifications through the system
2. **Monitoring:** Count rejected notifications by reason
3. **Performance:** Identify bottlenecks and retry patterns
4. **Audit:** Track what notifications were included/excluded and why
5. **Alerting:** Alert on high error rates or duplicate counts

### Component Architecture

**NotificationService:**
- Manages API communication
- Handles retries and error handling
- Provides high-level fetch methods
- Integrates logging at each step

**PriorityNotificationManager:**
- Maintains the min heap
- Normalizes and validates notifications
- Manages deduplication and read status
- Tracks statistics
- Provides top N as sorted array

**StructuredLogger:**
- Centralized logging utility
- Supports multiple log levels
- Captures context and details
- Non-blocking (errors don't break user flow)

### Future Improvements

#### 1. **Caching & Memoization**
- Cache notification metadata (ID, type) in memory
- Reduce redundant data transformation
- Use client-side caching with TTL for top N results

#### 2. **Streaming Updates**
- WebSocket integration for real-time notifications
- Push updates instead of polling
- Maintain top N across connected clients

#### 3. **Distributed Processing**
- Backend service for priority management (not client-side)
- Multiple workers processing notification batches
- Centralized database for seen/read status

#### 4. **Advanced Filtering**
- Time range filters
- Source/origin filters
- User preference-based filtering

#### 5. **Analytics & Insights**
- Dashboard showing notification distribution
- Trend analysis over time
- User engagement metrics

#### 6. **Performance Optimization**
- Use worker threads for batch processing
- Implement bloom filters for duplicate detection at scale
- Pagination with cursor-based navigation

---

## Stage 2: Frontend UI Implementation

### Architecture Overview

**Technology Stack:**
- Next.js 14 (App Router)
- React 18
- Material UI v5
- Axios for HTTP requests

**Project Structure:**
```
src/
├── app/
│   ├── api/
│   │   ├── notifications/route.js    # Proxy API endpoint
│   │   └── logs/route.js             # Logging endpoint
│   ├── layout.js                     # Root layout
│   ├── page.js                       # Home page
│   ├── priority/page.js              # Priority page
│   ├── providers/mui-theme.js        # Material UI theme
│   └── utils/                        # Utility functions
├── components/
│   ├── AppShell.jsx                  # Main layout wrapper
│   ├── NotificationCard.jsx          # Single notification display
│   ├── DashboardSummary.jsx          # Summary cards
│   ├── ErrorBanner.jsx               # Error display
│   └── LoadingState.jsx              # Loading skeleton
├── hooks/
│   └── useNotifications.js           # Custom notification hook
└── services/
    ├── api.js                        # API client setup
    ├── logger.js                     # Logging utility
    ├── NotificationService.js        # Service for API calls
    └── PriorityNotificationManager.js # Priority logic
```

### Key Features

#### 1. **Home Page (/)**
- Displays all available notifications
- Dashboard summary with counts
  - Total notifications
  - Event count
  - Result count
  - Placement count
- Responsive grid layout
- Loading and error states
- Retry functionality

#### 2. **Priority Page (/priority)**
- Shows top 10 unread notifications
- Priority-ordered (Placement > Result > Event)
- Filter dropdown by notification type
- Individual type filters:
  - All Types
  - Placement
  - Result
  - Event
- Real-time filtering
- Loading and error states

#### 3. **Components**

**AppShell:**
- Top navigation bar with branding
- Navigation links (Home, Priority)
- Active link highlighting
- Responsive container

**NotificationCard:**
- Material UI Card component
- Displays: Type, Message, Timestamp
- Badge for notification type
- Responsive layout
- Defensive rendering with fallbacks

**DashboardSummary:**
- 4-column grid (xs: 1, sm: 2, md: 4)
- Summary cards for each metric
- Loading skeleton during fetch
- Clean typography hierarchy

**ErrorBanner:**
- Material UI Alert component
- Error message display
- Retry button with icon
- Severity-based styling

**LoadingState:**
- 3-item skeleton grid
- Simulates card layout
- Provides visual feedback

#### 4. **Custom Hook: useNotifications**

**State Management:**
- `notifications`: Array of loaded notifications
- `isLoading`: Boolean for loading state
- `error`: Error message if fetch failed
- `stats`: Statistics from priority manager
- `summary`: Computed summary counts

**Features:**
- Automatic retry on mount
- Pagination support (page, limit)
- Notification type filtering
- Top N configuration
- Manual refetch function

**Behavior:**
- Cleanup on unmount to prevent memory leaks
- Aborts pending requests if component unmounts
- Revalidates on dependency changes

#### 5. **API Layer**

**Frontend to Backend Communication:**
- axios client for HTTP requests
- baseURL for consistency
- Timeout handling (15 seconds)
- Automatic retry with exponential backoff

**Backend Routes (Next.js):**
- `GET /api/notifications` → Proxies to external API
- `POST /api/logs` → Proxies log events to external API
- Adds Bearer token authentication
- Handles error responses gracefully

#### 6. **Material UI Theme**

**Color Palette:**
- Primary: #2952cc (Professional blue)
- Secondary: #0f766e (Teal)
- Background: #f6f7fb (Light gray)
- Text Primary: #172033 (Dark gray)
- Text Secondary: #667085 (Medium gray)

**Components:**
- Cards with subtle border and shadow
- Consistent border radius (8px)
- Custom font family (Geist Sans)
- Responsive typography

### UI/UX Principles

1. **Defensive Rendering:** All components handle missing/malformed data
2. **Loading States:** Visual feedback during data fetch
3. **Error Recovery:** Clear error messages with retry options
4. **Responsive Design:** Works on mobile, tablet, desktop
5. **Accessible:** Proper ARIA labels and semantic HTML
6. **Performance:** Efficient re-renders, memoization where needed

### Error Handling Flow

1. **API Failure:** Error message displayed to user
2. **Retry Option:** User can manually retry
3. **Fallback UI:** Graceful degradation with empty states
4. **Logging:** All errors logged with context
5. **User Feedback:** Clear messaging (not technical)

---

## Conclusion

The notification system is designed with:
- **Efficiency:** Min-heap for O(log N) operations
- **Reliability:** Comprehensive error handling and retries
- **Observability:** Extensive structured logging
- **User Experience:** Clean, responsive React UI
- **Scalability:** Efficient data structures for continuous arrival
- **Maintainability:** Clean separation of concerns

This implementation handles the requirements of both Stage 1 (priority logic) and Stage 2 (frontend UI) with production-ready code quality.
