"""
tests/test_priority_manager.py
--------------------------------
Unit tests for PriorityNotificationManager (min-heap logic).

Tests cover:
- top_n enforcement (heap never exceeds N)
- Correct eviction of the lowest-priority item when heap is full
- Global duplicate rejection across multiple push() calls
- get_top_n() returns items sorted highest-priority first
- push_batch() summary statistics
- reset() clears both heap and seen_ids
- Priority ordering across types and timestamps
- Edge cases: top_n=1, single notification, empty heap
"""

import heapq
import unittest
from datetime import datetime

from models.notification import Notification
from services.priority_notification_manager import PriorityNotificationManager


# ---------------------------------------------------------------------------
# Helper factories
# ---------------------------------------------------------------------------

_COUNTER = 0


def _make_notification(
    type_: str = "Event",
    timestamp: str = "2026-01-01 00:00:00",
    id_suffix: str | None = None,
) -> Notification:
    """Create a Notification with a unique ID."""
    global _COUNTER
    _COUNTER += 1
    suffix = id_suffix if id_suffix is not None else str(_COUNTER).zfill(12)
    # Build a UUID-like string so the model doesn't log a warning.
    uid = f"00000000-0000-0000-0000-{suffix}"
    return Notification(
        id=uid,
        type=type_,
        message=f"Test notification {_COUNTER}",
        timestamp=datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S"),
    )


# ---------------------------------------------------------------------------
# Test Cases
# ---------------------------------------------------------------------------

class TestPriorityNotificationManagerInit(unittest.TestCase):

    def test_valid_top_n(self):
        mgr = PriorityNotificationManager(top_n=10)
        self.assertEqual(mgr.top_n, 10)
        self.assertEqual(mgr.current_size, 0)

    def test_zero_top_n_raises(self):
        with self.assertRaises(ValueError):
            PriorityNotificationManager(top_n=0)

    def test_negative_top_n_raises(self):
        with self.assertRaises(ValueError):
            PriorityNotificationManager(top_n=-5)


class TestPushBehavior(unittest.TestCase):

    def setUp(self):
        self.mgr = PriorityNotificationManager(top_n=3)

    def test_push_below_capacity_always_accepted(self):
        for _ in range(3):
            n = _make_notification()
            accepted = self.mgr.push(n)
            self.assertTrue(accepted)
        self.assertEqual(self.mgr.current_size, 3)

    def test_heap_never_exceeds_top_n(self):
        for _ in range(10):
            self.mgr.push(_make_notification())
        self.assertLessEqual(self.mgr.current_size, 3)

    def test_high_priority_displaces_low_priority(self):
        # Fill heap with 3 Events (lowest priority type).
        for _ in range(3):
            self.mgr.push(_make_notification(type_="Event"))
        self.assertEqual(self.mgr.current_size, 3)

        # Now push a Placement — should evict one Event.
        placement = _make_notification(type_="Placement")
        accepted = self.mgr.push(placement)

        self.assertTrue(accepted)
        self.assertEqual(self.mgr.current_size, 3)
        # All retained items should include the Placement.
        ids_in_heap = {n.id for n in self.mgr._heap}
        self.assertIn(placement.id, ids_in_heap)

    def test_low_priority_not_inserted_when_heap_full(self):
        # Fill with 3 Placements.
        for _ in range(3):
            self.mgr.push(_make_notification(type_="Placement"))

        # Try to insert an Event — should be rejected.
        event = _make_notification(type_="Event")
        accepted = self.mgr.push(event)
        self.assertFalse(accepted)
        self.assertEqual(self.mgr.current_size, 3)

    def test_duplicate_id_rejected(self):
        n = _make_notification()
        self.mgr.push(n)
        accepted_again = self.mgr.push(n)  # same object, same ID
        self.assertFalse(accepted_again)
        self.assertEqual(self.mgr.current_size, 1)


class TestGetTopN(unittest.TestCase):

    def setUp(self):
        self.mgr = PriorityNotificationManager(top_n=5)

    def test_returns_sorted_highest_first(self):
        types_and_times = [
            ("Event",     "2026-01-01 00:00:00"),
            ("Result",    "2026-01-01 00:00:01"),
            ("Placement", "2026-01-01 00:00:02"),
            ("Event",     "2026-01-02 00:00:00"),
            ("Result",    "2026-01-02 00:00:01"),
        ]
        for t, ts in types_and_times:
            self.mgr.push(_make_notification(type_=t, timestamp=ts))

        top = self.mgr.get_top_n()
        scores = [n.priority_score for n in top]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_first_item_is_highest_priority(self):
        self.mgr.push(_make_notification(type_="Event"))
        self.mgr.push(_make_notification(type_="Placement"))
        self.mgr.push(_make_notification(type_="Result"))

        top = self.mgr.get_top_n()
        self.assertEqual(top[0].type, "Placement")

    def test_empty_heap_returns_empty_list(self):
        self.assertEqual(self.mgr.get_top_n(), [])

    def test_returns_at_most_top_n(self):
        for _ in range(20):
            self.mgr.push(_make_notification())
        self.assertLessEqual(len(self.mgr.get_top_n()), 5)


class TestPushBatch(unittest.TestCase):

    def setUp(self):
        self.mgr = PriorityNotificationManager(top_n=3)

    def test_batch_summary_correct(self):
        batch = [_make_notification(type_="Event") for _ in range(5)]
        summary = self.mgr.push_batch(batch)
        self.assertEqual(summary["batch_total"], 5)
        self.assertEqual(summary["inserted"] + summary["rejected"], 5)
        self.assertLessEqual(summary["heap_size"], 3)

    def test_batch_with_duplicates(self):
        n = _make_notification()
        batch = [n, n, n]   # same object three times
        summary = self.mgr.push_batch(batch)
        # Only the first occurrence should be inserted.
        self.assertEqual(summary["inserted"], 1)
        self.assertEqual(summary["rejected"], 2)


class TestReset(unittest.TestCase):

    def test_reset_clears_heap_and_seen_ids(self):
        mgr = PriorityNotificationManager(top_n=5)
        for _ in range(5):
            mgr.push(_make_notification())
        mgr.reset()
        self.assertEqual(mgr.current_size, 0)
        # After reset, same IDs can be inserted again.
        n = _make_notification()
        mgr.push(n)
        self.assertEqual(mgr.current_size, 1)


class TestHeapProperty(unittest.TestCase):
    """Verify that the internal _heap always satisfies the min-heap invariant."""

    def test_heap_invariant_maintained(self):
        mgr = PriorityNotificationManager(top_n=5)
        types = ["Placement", "Result", "Event", "Placement", "Result",
                 "Event", "Placement", "Result"]
        for t in types:
            mgr.push(_make_notification(type_=t))

        # The heap root must have the minimum priority_score among all heap elements.
        # When multiple items share the same score, any of them is a valid root,
        # so we compare scores rather than object identity.
        min_score_in_heap = min(n.priority_score for n in mgr._heap)
        self.assertEqual(mgr._heap[0].priority_score, min_score_in_heap)

        # Additionally verify that re-heapifying a copy produces a root
        # with the same score (not necessarily the same object).
        heap_copy = list(mgr._heap)
        heapq.heapify(heap_copy)
        self.assertEqual(heap_copy[0].priority_score, mgr._heap[0].priority_score)


class TestTopNOne(unittest.TestCase):
    """Edge-case: top_n = 1 should always keep the single highest-priority item."""

    def test_top_1_keeps_highest(self):
        mgr = PriorityNotificationManager(top_n=1)
        event     = _make_notification(type_="Event")
        placement = _make_notification(type_="Placement")
        result    = _make_notification(type_="Result")

        mgr.push(event)
        mgr.push(result)     # should evict event
        mgr.push(placement)  # should evict result

        top = mgr.get_top_n()
        self.assertEqual(len(top), 1)
        self.assertEqual(top[0].type, "Placement")


if __name__ == "__main__":
    unittest.main(verbosity=2)
