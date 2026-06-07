# Stage 1

## Problem Statement

The campus notifications platform is overwhelmed with a high volume of notifications across three categories: **Placement**, **Result**, and **Event**. Students lose track of the most important notifications because they are buried under lower-priority ones.

The goal of Stage 1 is to implement a **Priority Inbox** that always surfaces the top N most important *unread* notifications first — where N is configurable by the user (e.g. 10, 15, 20). Notifications are fetched live from a protected REST API; they are never stored in a database and never hardcoded.

---

## Priority Logic

```
Placement  >  Result  >  Event
```

| Type      | Weight |
|-----------|--------|
| Placement | 300    |
| Result    | 200    |
| Event     | 100    |

**Within the same type**, newer notifications (higher Unix timestamp) rank higher.

### Composite Priority Score

A single comparable integer encodes both dimensions:

```
priority_score = type_weight × 10¹² + unix_timestamp_in_seconds
```

The scale factor `10¹²` ensures that even a Placement notification from the year 2000 outranks any Result or Event notification from 2100, preserving strict type-based ordering at all times.

---

## Data Structures Used

### Min-Heap of size N

A **min-heap** (Python's `heapq` module) is used to maintain the top-N highest-priority notifications.

**Why a min-heap and not a sorted list?**

| Approach | Insert | Retrieve Top-N | Space |
|---|---|---|---|
| Full sort every time | O(M log M) | O(N) | O(M) |
| Min-Heap of size N | **O(log N)** | O(N log N) | **O(N)** |

The key insight is that to track the *top* N items we only need to know what the *current minimum of those N* is. The heap root always holds that minimum, making it a perfect candidate for eviction when a new, higher-priority item arrives.

**Eviction Rule (O(log N)):**
1. If `heap.size < N` → push unconditionally.  
2. If `new_item.priority_score > heap_root.priority_score` → `heapreplace(heap, new_item)` (atomic pop + push, O(log N)).  
3. Otherwise → discard.

---

## Time Complexity

| Operation | Complexity | Notes |
|---|---|---|
| Single notification insertion | **O(log N)** | `heappush` or `heapreplace` |
| Retrieve current top-N | **O(N log N)** | Sort the N heap elements |
| Process a batch of M items | **O(M log N)** | M individual O(log N) insertions |
| Duplicate check per item | **O(1)** | Hash-set lookup on `seen_ids` |

**Total for one fetch cycle of M raw notifications into a heap of size N:**  
`O(M log N)` — this is optimal. No global sorting of the entire historical dataset is ever needed.

---

## Scalability Discussion

### Continuous Arrival Without Reprocessing

The `PriorityNotificationManager` maintains a **persistent heap and a global `seen_ids` set** across fetch cycles. When new notifications arrive via a subsequent API poll:

1. The `seen_ids` set ensures no notification is processed twice — O(1) check.
2. Each new notification undergoes the O(log N) heap operation.
3. Historical notifications already in the heap are **never touched** — no full re-sort.

This means the system scales linearly with the *number of new arrivals per cycle*, not with the total historical dataset size.

```
Cycle 1:  M₁ new notifications → O(M₁ log N)
Cycle 2:  M₂ new notifications → O(M₂ log N)
Cycle k:  Mₖ new notifications → O(Mₖ log N)
```

Total across all cycles: `O((M₁ + M₂ + … + Mₖ) log N)` — perfectly linear in total arrivals.

### Future Horizontal Scaling

For true distributed scale, the heap can be sharded by notification type across multiple workers, with a final merge step across N-element heaps — still O(N log P) for P shards.

---

## Fault Tolerance

### API Failure Handling

| Failure Type | Detection | Recovery |
|---|---|---|
| Network timeout | `requests.Timeout` | Retry with exponential back-off |
| Connection error | `requests.ConnectionError` | Retry with exponential back-off |
| HTTP 4xx / 5xx | `requests.HTTPError` | Retry; 401 triggers re-authentication |
| Invalid JSON | `ValueError` on `.json()` | Retry; reject malformed response |
| All retries exhausted | `RuntimeError` raised | Application exits with diagnostic log |

### Retry Strategy

```
Attempt 1 → fail → sleep(backoff_base × 2⁰)
Attempt 2 → fail → sleep(backoff_base × 2¹)
Attempt 3 → fail → RuntimeError raised
```

Default: `backoff_base = 1.0s`, `max_retries = 3`.  
All values are configurable via environment variables.

### Malformed Notification Handling

Each raw record goes through `_parse_and_validate()` before entering the heap:

| Problem | Action |
|---|---|
| Missing required field | Rejected → `notification_rejected` log |
| Unknown Type value | Rejected → `notification_rejected` log |
| Unparseable Timestamp | Falls back to epoch (1970-01-01); warning logged |
| Duplicate ID (same batch) | Rejected → `notification_rejected` log |
| Duplicate ID (cross-batch) | Rejected by `seen_ids` set check |
| Raw value is not a dict | Rejected → `notification_rejected` log |

---

## Logging Strategy

All logging uses structured **JSON records** emitted to stdout, enabling ingestion by Datadog, Splunk, ELK, or any log aggregation system without regex parsing.

### Event Taxonomy

| Event Name | Level | Why Logged |
|---|---|---|
| `api_request_started` | INFO | Marks the start of a timed HTTP call; enables latency computation |
| `api_request_completed` | INFO | Records HTTP status, round-trip ms, and notification count |
| `api_request_failed` | ERROR | Captures failure reason, attempt number, and retry budget |
| `notification_processed` | DEBUG | Full audit trail of every accepted notification |
| `notification_rejected` | WARNING | Surfaces data quality issues (malformed, duplicate, unknown type) |
| `top_n_updated` | INFO | Records every heap mutation (insert + optional eviction) |
| `auth_started` | INFO | Marks authentication initiation |
| `auth_success` | INFO | Confirms token acquisition |
| `batch_processing_started` | INFO | Marks start of heap ingestion for a batch |
| `batch_processing_complete` | INFO | Summary: total/inserted/rejected per batch |
| `application_started` | INFO | System startup with configured N |
| `application_complete` | INFO | Successful exit with result count |

### Sample Log Record (JSON)

```json
{
  "timestamp": "2026-06-07T13:15:00",
  "level": "INFO",
  "logger": "services.priority_notification_manager",
  "message": "Top-10 heap updated: inserted=b283218f-... evicted=none heap_size=3",
  "event": "top_n_updated",
  "top_n": 10,
  "heap_size": 3,
  "evicted_id": null,
  "inserted_id": "b283218f-ea5a-4b7c-93a9-1f2f240d64b0"
}
```

---

## Future Improvements

### 1. Caching
Introduce a short-lived **in-memory LRU cache** (e.g. `cachetools.TTLCache`) for the raw API response. If the same set of notifications is requested within a short window (e.g. 5 seconds), serve from cache to reduce API pressure. Invalidate on token expiry or explicit refresh signals.

### 2. Streaming Updates (WebSocket / Server-Sent Events)
Replace HTTP polling with a **WebSocket or SSE subscription** to the notification service. This eliminates the polling delay, reduces wasted network calls when no new notifications exist, and enables true real-time priority inbox updates.

### 3. Distributed Processing (Apache Kafka + Flink)
For campus-wide scale with thousands of concurrent users:
- **Kafka** ingests notification events as a durable stream.
- **Flink** maintains per-user top-N heaps as streaming aggregations.
- Each user's priority inbox is computed continuously without any batch reprocessing.
- The stateful heap lives in Flink's managed state, providing exactly-once semantics and automatic recovery.

### 4. Persistent Read-State Tracking
Add a lightweight key-value store (Redis) to persist the `is_read` flag per user per notification, enabling true "unread" filtering without a heavy relational database.

### 5. Multi-Tenant Top-N
Extend `PriorityNotificationManager` to be keyed by `user_id`, maintaining independent heaps per student with shared notification data — enabling personalised priority inboxes at scale.
