# Stage 1

## Problem Statement

Stage 1 fetches notifications directly from:

`GET http://4.224.186.213/evaluation-service/notifications`

The request uses:

`Authorization: Bearer <TOKEN>`

The token is obtained server-side from the evaluation auth endpoint using the
registered email, roll number, access code, client ID, and client secret.

The system returns the top N highest-priority unread notifications without using a database and without hardcoded notification data. Notifications are validated, deduplicated, filtered for unread state, and retained in memory only.

## Priority Logic

Placement > Result > Event

Priority is evaluated in two steps:

1. Notification type priority is compared first.
2. For notifications with the same type, newer `Timestamp` values rank higher.

Supported notification shape:

```json
{
  "ID": "uuid",
  "Type": "Placement",
  "Message": "text",
  "Timestamp": "yyyy-mm-dd hh:mm:ss"
}
```

Notifications with missing required fields, unsupported types, malformed timestamps, duplicate IDs, or read status are rejected and logged.

## Data Structures Used

The core data structure is a bounded min heap implemented by `PriorityNotificationManager`.

A min heap is used because the system only needs to retain the top N notifications. The lowest-ranked item among the retained top N stays at the root. When a new unread notification arrives:

- If the heap has fewer than N items, the notification is inserted.
- If the heap is full and the new notification outranks the root, the root is replaced.
- If the new notification does not outrank the root, it is discarded.

This avoids sorting the entire dataset each time new notifications arrive.

## Time Complexity

Notification insertion:
O(log N)

Top N retrieval:
O(N)

The heap can expose the retained top N set in O(N). The UI may additionally order only those retained N items for presentation; this never sorts the full API dataset.

Duplicate detection:
O(1) average using an in-memory `Set` of notification IDs.

## Scalability Discussion

New notifications can continuously arrive as batches from polling, streaming, or any future delivery mechanism. Each notification is processed independently through the same heap insertion path. Historical notifications do not need to be reprocessed because the heap already contains the current best N candidates and the duplicate set prevents repeated work.

The memory footprint remains bounded by:

- N retained notifications in the heap.
- The number of seen IDs retained for duplicate detection during the current runtime.

## Fault Tolerance

API failures are handled in `NotificationService` with retry support. Each failed request is logged with request metadata and error details. Retries use a simple increasing delay so temporary network or service issues can recover without immediately failing the user flow.

Malformed notifications do not fail the whole batch. They are rejected individually, logged with a reason, and processing continues for the rest of the response.

## Logging Strategy

Structured logs are sent through the evaluation logging endpoint:

`POST http://4.224.186.213/evaluation-service/logs`

Logged events:

- `api_request_started`: records outbound API request metadata.
- `api_request_completed`: records response status and notification count.
- `api_request_failed`: records API failure details.
- `api_request_retry_scheduled`: records retry attempts and delay.
- `notification_processed`: records accepted unread notifications.
- `notification_rejected`: records malformed, duplicate, read, or unsupported notifications.
- `top_n_updated`: records heap insertions and replacements.

Logging failures are swallowed so logging middleware never blocks notification retrieval.

## Future Improvements

- Add short-lived caching to reduce repeated API calls.
- Use streaming updates or server-sent events for real-time notification arrival.
- Move duplicate tracking to a bounded TTL cache for long-running sessions.
- Add distributed processing if multiple workers need to process high-volume notification streams.
- Add observability dashboards for rejection rates, API latency, and retry frequency.
