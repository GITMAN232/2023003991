"""
tests/test_notification_model.py
----------------------------------
Unit tests for the Notification data model.

Tests cover:
- from_dict() happy-path parsing
- Missing required fields (all combinations)
- Unknown notification types
- Malformed / unparseable timestamps
- Priority score ordering:  Placement > Result > Event
- Recency ordering within the same type
- Immutability (frozen dataclass)
- __eq__ / __hash__ by ID
- Heap comparators (__lt__, __gt__)
"""

import unittest
from datetime import datetime

from models.notification import Notification, _parse_timestamp, VALID_TYPES


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_raw(
    id_: str = "aaaaaaaa-0000-0000-0000-000000000001",
    type_: str = "Placement",
    message: str = "Test message",
    timestamp: str = "2026-04-22 17:51:30",
) -> dict:
    """Return a well-formed raw notification dictionary."""
    return {"ID": id_, "Type": type_, "Message": message, "Timestamp": timestamp}


# ---------------------------------------------------------------------------
# Test Cases
# ---------------------------------------------------------------------------

class TestNotificationFromDict(unittest.TestCase):
    """Tests for Notification.from_dict() deserialization."""

    def test_valid_placement(self):
        raw = _make_raw(type_="Placement")
        n = Notification.from_dict(raw)
        self.assertEqual(n.type, "Placement")
        self.assertFalse(n.is_read)

    def test_valid_result(self):
        raw = _make_raw(type_="Result")
        n = Notification.from_dict(raw)
        self.assertEqual(n.type, "Result")

    def test_valid_event(self):
        raw = _make_raw(type_="Event")
        n = Notification.from_dict(raw)
        self.assertEqual(n.type, "Event")

    def test_missing_id_raises(self):
        raw = _make_raw()
        del raw["ID"]
        with self.assertRaises(ValueError) as ctx:
            Notification.from_dict(raw)
        self.assertIn("ID", str(ctx.exception))

    def test_missing_type_raises(self):
        raw = _make_raw()
        del raw["Type"]
        with self.assertRaises(ValueError):
            Notification.from_dict(raw)

    def test_missing_message_raises(self):
        raw = _make_raw()
        del raw["Message"]
        with self.assertRaises(ValueError):
            Notification.from_dict(raw)

    def test_missing_timestamp_raises(self):
        raw = _make_raw()
        del raw["Timestamp"]
        with self.assertRaises(ValueError):
            Notification.from_dict(raw)

    def test_unknown_type_raises(self):
        raw = _make_raw(type_="Unknown")
        with self.assertRaises(ValueError) as ctx:
            Notification.from_dict(raw)
        self.assertIn("Unknown", str(ctx.exception))

    def test_all_valid_types_accepted(self):
        for t in VALID_TYPES:
            raw = _make_raw(type_=t)
            n = Notification.from_dict(raw)
            self.assertEqual(n.type, t)

    def test_malformed_timestamp_falls_back_to_epoch(self):
        raw = _make_raw(timestamp="not-a-date")
        n = Notification.from_dict(raw)
        self.assertEqual(n.timestamp, datetime(1970, 1, 1, 0, 0, 0))

    def test_iso_timestamp_format_parsed(self):
        raw = _make_raw(timestamp="2026-04-22T17:51:30")
        n = Notification.from_dict(raw)
        self.assertEqual(n.timestamp.year, 2026)


class TestNotificationPriorityScore(unittest.TestCase):
    """Tests for priority_score computation and ordering."""

    def _notification(self, type_: str, timestamp: str) -> Notification:
        return Notification.from_dict(_make_raw(type_=type_, timestamp=timestamp))

    def test_placement_beats_result(self):
        p = self._notification("Placement", "2026-01-01 00:00:00")
        r = self._notification("Result",    "2026-01-01 00:00:00")
        self.assertGreater(p.priority_score, r.priority_score)

    def test_placement_beats_event(self):
        p = self._notification("Placement", "2026-01-01 00:00:00")
        e = self._notification("Event",     "2026-01-01 00:00:00")
        self.assertGreater(p.priority_score, e.priority_score)

    def test_result_beats_event(self):
        r = self._notification("Result", "2026-01-01 00:00:00")
        e = self._notification("Event",  "2026-01-01 00:00:00")
        self.assertGreater(r.priority_score, e.priority_score)

    def test_newer_placement_beats_older_placement(self):
        newer = self._notification("Placement", "2026-04-22 18:00:00")
        older = self._notification("Placement", "2026-04-22 17:00:00")
        self.assertGreater(newer.priority_score, older.priority_score)

    def test_older_placement_does_not_beat_newer_result(self):
        """Placement type always wins regardless of timestamp."""
        very_old_placement = self._notification("Placement", "2000-01-01 00:00:00")
        very_new_result    = self._notification("Result",    "2030-01-01 00:00:00")
        self.assertGreater(very_old_placement.priority_score, very_new_result.priority_score)

    def test_heap_comparators_lt(self):
        low  = self._notification("Event",     "2026-01-01 00:00:00")
        high = self._notification("Placement", "2026-01-01 00:00:00")
        self.assertTrue(low < high)
        self.assertFalse(high < low)

    def test_heap_comparators_gt(self):
        low  = self._notification("Event",     "2026-01-01 00:00:00")
        high = self._notification("Placement", "2026-01-01 00:00:00")
        self.assertTrue(high > low)


class TestNotificationEquality(unittest.TestCase):
    """Tests for __eq__ and __hash__ by ID."""

    def test_same_id_equal(self):
        a = Notification.from_dict(_make_raw(id_="aaa-111"))
        b = Notification.from_dict(_make_raw(id_="aaa-111", type_="Event"))
        # Equal by ID even if type differs.
        self.assertEqual(a, b)

    def test_different_id_not_equal(self):
        a = Notification.from_dict(_make_raw(id_="aaa-111"))
        b = Notification.from_dict(_make_raw(id_="bbb-222"))
        self.assertNotEqual(a, b)

    def test_hashable_in_set(self):
        a = Notification.from_dict(_make_raw(id_="aaa-111"))
        b = Notification.from_dict(_make_raw(id_="aaa-111"))
        s = {a, b}
        self.assertEqual(len(s), 1)


class TestNotificationImmutability(unittest.TestCase):
    """The frozen dataclass must reject all attribute mutations."""

    def test_cannot_mutate_type(self):
        n = Notification.from_dict(_make_raw())
        with self.assertRaises(Exception):   # FrozenInstanceError
            n.type = "Event"  # type: ignore[misc]

    def test_cannot_mutate_is_read(self):
        n = Notification.from_dict(_make_raw())
        with self.assertRaises(Exception):
            n.is_read = True  # type: ignore[misc]


class TestTimestampParser(unittest.TestCase):
    """Unit tests for the internal _parse_timestamp helper."""

    def test_standard_format(self):
        dt = _parse_timestamp("2026-04-22 17:51:30")
        self.assertEqual(dt, datetime(2026, 4, 22, 17, 51, 30))

    def test_iso_format_with_T(self):
        dt = _parse_timestamp("2026-04-22T17:51:30")
        self.assertEqual(dt, datetime(2026, 4, 22, 17, 51, 30))

    def test_iso_format_with_Z(self):
        dt = _parse_timestamp("2026-04-22T17:51:30Z")
        self.assertEqual(dt, datetime(2026, 4, 22, 17, 51, 30))

    def test_garbage_returns_epoch(self):
        dt = _parse_timestamp("not-a-timestamp")
        self.assertEqual(dt, datetime(1970, 1, 1, 0, 0, 0))

    def test_empty_string_returns_epoch(self):
        dt = _parse_timestamp("   ")
        self.assertEqual(dt, datetime(1970, 1, 1, 0, 0, 0))


if __name__ == "__main__":
    unittest.main(verbosity=2)
