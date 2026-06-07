"""
models/notification.py
----------------------
Defines the core Notification data model and all priority-comparison logic.

Design Notes
------------
* The Notification dataclass is intentionally immutable (frozen=True) to prevent
  accidental mutation after creation and to allow safe use as a heap element.
* Priority ordering is embedded directly in the model via __lt__ so that the
  heapq module can work without any external key functions.
* Priority encoding uses a composite integer:
      composite_priority = type_weight * 10^18 + unix_timestamp_nanoseconds
  This packs both the type dimension and the recency dimension into a single
  comparable number, making O(1) comparisons inside the heap.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import ClassVar

from config import TYPE_PRIORITY_WEIGHT

# Sentinel timestamp used when the Timestamp field is missing or unparseable.
_EPOCH_DATETIME = datetime(1970, 1, 1, 0, 0, 0)

# ISO / API timestamp formats to try in order.
_TIMESTAMP_FORMATS: list[str] = [
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%dT%H:%M:%SZ",
    "%Y-%m-%dT%H:%M:%S.%f",
    "%Y-%m-%dT%H:%M:%S.%fZ",
]

# Valid notification types declared in the API contract.
VALID_TYPES: frozenset[str] = frozenset(TYPE_PRIORITY_WEIGHT.keys())

# UUID-like pattern used for lightweight ID validation.
_UUID_PATTERN: re.Pattern = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)


def _parse_timestamp(raw: str) -> datetime:
    """
    Attempt to parse *raw* against every known timestamp format.

    Returns
    -------
    datetime
        Parsed datetime on success, or the epoch sentinel on failure.
    """
    raw = raw.strip()
    for fmt in _TIMESTAMP_FORMATS:
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return _EPOCH_DATETIME


@dataclass(frozen=True, order=False)
class Notification:
    """
    Immutable representation of a single notification from the API.

    Attributes
    ----------
    id : str
        Unique identifier (UUID format expected).
    type : str
        One of "Placement", "Result", or "Event".
    message : str
        Human-readable notification body.
    timestamp : datetime
        When the notification was created / emitted.
    is_read : bool
        Whether the notification has been consumed.  Defaults to False (unread).

    Computed Properties
    -------------------
    priority_score : int
        Composite integer encoding both type weight and recency.  Higher score
        means higher overall priority.  Used directly by the heap comparator.
    """

    id: str
    type: str
    message: str
    timestamp: datetime
    is_read: bool = False

    # ------------------------------------------------------------------ #
    # Priority Scoring                                                     #
    # ------------------------------------------------------------------ #

    @property
    def priority_score(self) -> int:
        """
        Compute a single comparable integer that encodes both the type priority
        and the recency of the notification.

        Formula
        -------
            priority_score = type_weight * SCALE + unix_seconds

        where SCALE is large enough that any type_weight difference dominates
        any timestamp difference (even across decades of data).

        The result is:
            * Larger  →  higher priority  (should stay in the top-N heap).
            * Smaller →  lower priority   (first to be evicted when heap is full).
        """
        type_weight: int = TYPE_PRIORITY_WEIGHT.get(self.type, 0)
        # Use 10^12 as the scale factor: timestamp differences in seconds
        # (billions at most) will never overflow into the type weight space.
        unix_seconds: int = int(self.timestamp.timestamp())
        return type_weight * 10**12 + unix_seconds

    # ------------------------------------------------------------------ #
    # Heap Comparators (min-heap semantics)                               #
    # ------------------------------------------------------------------ #

    def __lt__(self, other: "Notification") -> bool:
        """Lower priority_score means 'less than' — it will be at the heap root."""
        return self.priority_score < other.priority_score

    def __le__(self, other: "Notification") -> bool:
        return self.priority_score <= other.priority_score

    def __gt__(self, other: "Notification") -> bool:
        return self.priority_score > other.priority_score

    def __ge__(self, other: "Notification") -> bool:
        return self.priority_score >= other.priority_score

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Notification):
            return NotImplemented
        return self.id == other.id  # identity equality by unique ID

    def __hash__(self) -> int:
        return hash(self.id)

    # ------------------------------------------------------------------ #
    # Factory / Deserialization                                            #
    # ------------------------------------------------------------------ #

    @classmethod
    def from_dict(cls, data: dict) -> "Notification":
        """
        Construct a Notification from a raw API response dictionary.

        Raises
        ------
        ValueError
            If any required field is missing or the notification type is unknown.
        """
        # --- Validate required fields ----------------------------------- #
        missing_fields = [f for f in ("ID", "Type", "Message", "Timestamp") if f not in data]
        if missing_fields:
            raise ValueError(f"Missing required fields: {missing_fields}")

        notification_id: str = str(data["ID"]).strip()
        notification_type: str = str(data["Type"]).strip()
        message: str = str(data["Message"]).strip()
        raw_timestamp: str = str(data["Timestamp"]).strip()

        # --- Validate type ---------------------------------------------- #
        if notification_type not in VALID_TYPES:
            raise ValueError(
                f"Unknown notification type '{notification_type}'. "
                f"Expected one of {sorted(VALID_TYPES)}."
            )

        # --- Validate ID (soft: warn but do not reject) ----------------- #
        if not _UUID_PATTERN.match(notification_id):
            # Allow non-UUID IDs but flag them; do not silently rename.
            pass  # caller (NotificationService) will log this as a warning

        # --- Parse timestamp -------------------------------------------- #
        parsed_timestamp = _parse_timestamp(raw_timestamp)

        return cls(
            id=notification_id,
            type=notification_type,
            message=message,
            timestamp=parsed_timestamp,
        )

    # ------------------------------------------------------------------ #
    # Serialization                                                        #
    # ------------------------------------------------------------------ #

    def to_dict(self) -> dict:
        """Return a JSON-serialisable dictionary representation."""
        return {
            "id": self.id,
            "type": self.type,
            "message": self.message,
            "timestamp": self.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "is_read": self.is_read,
            "priority_score": self.priority_score,
        }

    def __repr__(self) -> str:
        return (
            f"Notification(id={self.id!r}, type={self.type!r}, "
            f"priority_score={self.priority_score}, "
            f"timestamp={self.timestamp.isoformat()!r})"
        )
