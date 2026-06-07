"""
services/priority_notification_manager.py
-------------------------------------------
Maintains the top-N highest-priority unread notifications using a Min-Heap.

Why a Min-Heap?
---------------
To keep the top-N highest-priority items, we maintain a min-heap of exactly N
elements where the ROOT is always the LOWEST-priority item currently in the top
set.  When a new notification arrives:

  1.  If the heap has fewer than N elements → push unconditionally.
  2.  If the heap is full AND the new item's priority_score > heap root's score
      → pop the root (evict the current lowest of the top-N) and push the new item.
  3.  Otherwise → discard the new item (it cannot displace any top-N member).

Time Complexity
---------------
* Insertion of one notification  : O(log N)
* Retrieving the current top-N   : O(N log N)  (heap sort of N elements)
* Processing a batch of M items  : O(M log N)

Space Complexity
----------------
* O(N) — the heap only ever holds at most N elements regardless of how many
  notifications have been seen in total.

Scalability
-----------
New notifications stream in and are inserted one at a time.  The manager never
needs to re-sort the entire historical dataset; each insertion is O(log N).
This makes it suitable for high-throughput real-time ingestion.
"""

from __future__ import annotations

import heapq

from middleware.logging_middleware import NotificationLogger
from models.notification import Notification


class PriorityNotificationManager:
    """
    Maintains the top-N highest-priority unread notifications in O(log N) per insert.

    Internally holds a min-heap of size ≤ N.  The heap root is always the
    notification with the LOWEST priority among the current top-N candidates,
    making it the natural eviction target when the heap is full.

    Parameters
    ----------
    top_n : int
        Maximum number of high-priority notifications to track.

    Attributes
    ----------
    _heap : list[Notification]
        The min-heap (managed by the heapq module).
    _seen_ids : set[str]
        All notification IDs ever inserted — used for O(1) global duplicate checks.
    """

    def __init__(self, top_n: int) -> None:
        if top_n <= 0:
            raise ValueError(f"top_n must be a positive integer, got {top_n!r}")

        self._top_n: int = top_n
        self._heap: list[Notification] = []
        self._seen_ids: set[str] = set()          # global dedup across all batches
        self._logger: NotificationLogger = NotificationLogger(__name__)

        self._logger.info(
            f"PriorityNotificationManager initialised with top_n={top_n}",
            event="manager_initialised",
            top_n=top_n,
        )

    # ------------------------------------------------------------------
    # Public Interface
    # ------------------------------------------------------------------

    @property
    def top_n(self) -> int:
        """The configured maximum heap size."""
        return self._top_n

    @property
    def current_size(self) -> int:
        """Number of notifications currently in the heap."""
        return len(self._heap)

    def push(self, notification: Notification) -> bool:
        """
        Attempt to insert *notification* into the top-N heap.

        Parameters
        ----------
        notification : Notification
            A validated, unread Notification to consider.

        Returns
        -------
        bool
            True if the notification entered the heap, False if it was rejected
            (either a duplicate or outranked by the current bottom of the top-N).
        """
        # Global duplicate guard (covers cross-batch duplicates).
        if notification.id in self._seen_ids:
            self._logger.notification_rejected(
                raw_data={"ID": notification.id},
                reason=f"Already processed notification ID: {notification.id}",
            )
            return False

        self._seen_ids.add(notification.id)

        evicted_id: str | None = None
        entered_heap: bool

        if len(self._heap) < self._top_n:
            # Heap not yet full — push unconditionally.
            heapq.heappush(self._heap, notification)
            entered_heap = True

        elif notification > self._heap[0]:
            # New item outranks the current bottom of top-N → replace it.
            evicted = heapq.heapreplace(self._heap, notification)
            evicted_id = evicted.id
            entered_heap = True

        else:
            # New item cannot displace any current top-N member.
            self._logger.debug(
                f"Notification {notification.id} not in top-{self._top_n} "
                f"(score={notification.priority_score} ≤ heap_min={self._heap[0].priority_score})",
                event="notification_below_threshold",
                notification_id=notification.id,
                priority_score=notification.priority_score,
                heap_min_score=self._heap[0].priority_score,
            )
            entered_heap = False

        if entered_heap:
            self._logger.top_n_updated(
                top_n=self._top_n,
                heap_size=len(self._heap),
                evicted_id=evicted_id,
                inserted_id=notification.id,
            )

        return entered_heap

    def push_batch(self, notifications: list[Notification]) -> dict:
        """
        Insert a batch of notifications into the heap.

        Parameters
        ----------
        notifications : list[Notification]
            Validated notifications from one fetch cycle.

        Returns
        -------
        dict
            Summary statistics: total, inserted, rejected.
        """
        self._logger.info(
            f"Processing batch of {len(notifications)} notification(s)",
            event="batch_processing_started",
            batch_size=len(notifications),
        )

        inserted = 0
        rejected = 0

        for notification in notifications:
            if self.push(notification):
                inserted += 1
            else:
                rejected += 1

        summary = {
            "batch_total":  len(notifications),
            "inserted":     inserted,
            "rejected":     rejected,
            "heap_size":    len(self._heap),
        }

        self._logger.info(
            f"Batch processing complete: {inserted} inserted, {rejected} rejected",
            event="batch_processing_complete",
            **summary,
        )

        return summary

    def get_top_n(self) -> list[Notification]:
        """
        Return the current top-N notifications sorted highest-priority first.

        Time Complexity: O(N log N) — sorting N heap elements.

        Returns
        -------
        list[Notification]
            Sorted list, index 0 is the highest-priority notification.
        """
        # heapq.nlargest uses a heap internally → O(N log N) but always correct.
        top = sorted(self._heap, key=lambda n: n.priority_score, reverse=True)
        self._logger.debug(
            f"Top-{self._top_n} retrieved ({len(top)} items)",
            event="top_n_retrieved",
            top_n=self._top_n,
            retrieved_count=len(top),
        )
        return top

    def reset(self) -> None:
        """
        Clear the heap and the global seen-IDs set.
        Useful for test isolation and periodic refresh cycles.
        """
        self._heap.clear()
        self._seen_ids.clear()
        self._logger.info(
            "PriorityNotificationManager state reset",
            event="manager_reset",
        )

    # ------------------------------------------------------------------
    # Diagnostics
    # ------------------------------------------------------------------

    def heap_summary(self) -> dict:
        """Return a lightweight diagnostic snapshot of the current heap state."""
        return {
            "top_n":        self._top_n,
            "heap_size":    len(self._heap),
            "heap_min_score": self._heap[0].priority_score if self._heap else None,
            "heap_max_score": max(n.priority_score for n in self._heap) if self._heap else None,
            "total_seen":   len(self._seen_ids),
        }
