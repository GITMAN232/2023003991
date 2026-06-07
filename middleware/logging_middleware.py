"""
middleware/logging_middleware.py
---------------------------------
Structured, levelled logging middleware for the Notification Priority System.

Design Goals
------------
1. Every log record is emitted as a JSON object so that log-aggregation
   platforms (Datadog, Splunk, ELK) can index fields without regex parsing.
2. A plain "text" formatter is also supported for local development via the
   LOG_FORMAT environment variable.
3. The Logger is a thin façade over Python's built-in `logging` module so that
   the rest of the codebase has no direct coupling to the stdlib API.
4. Dedicated helper methods encode the exact events the evaluation requires:
     * api_request_started
     * api_request_completed
     * api_request_failed
     * notification_processed
     * notification_rejected
     * top_n_updated

Logged Fields (every record)
-----------------------------
timestamp   – ISO-8601 wall-clock time
level       – DEBUG / INFO / WARNING / ERROR / CRITICAL
event       – Structured event name (machine-readable)
message     – Human-readable description
+ arbitrary keyword arguments passed by the caller
"""

from __future__ import annotations

import json
import logging
import sys
import time
from typing import Any

from config import LOG_FORMAT, LOG_LEVEL


# ---------------------------------------------------------------------------
# JSON Formatter
# ---------------------------------------------------------------------------

class _JsonFormatter(logging.Formatter):
    """
    Converts a LogRecord into a single-line JSON string.

    All extra keyword arguments stored in record.__dict__ that are not part of
    the standard LogRecord schema are forwarded as top-level JSON fields.
    """

    # Standard LogRecord attributes that we do NOT forward as extras.
    _STDLIB_ATTRS: frozenset[str] = frozenset({
        "name", "msg", "args", "created", "filename", "funcName", "levelname",
        "levelno", "lineno", "module", "msecs", "pathname", "process",
        "processName", "relativeCreated", "stack_info", "thread", "threadName",
        "exc_info", "exc_text", "message",
    })

    def format(self, record: logging.LogRecord) -> str:
        record.message = record.getMessage()

        payload: dict[str, Any] = {
            "timestamp": self.formatTime(record, datefmt="%Y-%m-%dT%H:%M:%S"),
            "level":     record.levelname,
            "logger":    record.name,
            "message":   record.message,
        }

        # Append any extra fields injected by the caller.
        for key, value in record.__dict__.items():
            if key not in self._STDLIB_ATTRS and not key.startswith("_"):
                payload[key] = value

        # Append exception traceback if present.
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str)


# ---------------------------------------------------------------------------
# Text Formatter (development convenience)
# ---------------------------------------------------------------------------

class _TextFormatter(logging.Formatter):
    """Human-readable formatter for local development."""

    _FMT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"

    def __init__(self) -> None:
        super().__init__(fmt=self._FMT, datefmt="%Y-%m-%d %H:%M:%S")


# ---------------------------------------------------------------------------
# NotificationLogger – public API
# ---------------------------------------------------------------------------

class NotificationLogger:
    """
    Structured logger façade used throughout the Notification Priority System.

    Usage
    -----
    logger = NotificationLogger(__name__)
    logger.api_request_started(url="http://...")
    logger.notification_processed(notification_id="uuid", priority=300)

    All methods accept arbitrary keyword arguments that are forwarded into the
    structured log record as extra fields, making it easy to add context without
    changing the method signature.
    """

    def __init__(self, name: str) -> None:
        self._logger = logging.getLogger(name)
        self._configure_handler()

    # ------------------------------------------------------------------
    # Configuration (idempotent)
    # ------------------------------------------------------------------

    def _configure_handler(self) -> None:
        """Attach a handler to the root logger if none exist yet."""
        root = logging.getLogger()
        if root.handlers:
            return  # Already configured by a previous call.

        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(LOG_LEVEL)

        formatter: logging.Formatter
        if LOG_FORMAT.lower() == "json":
            formatter = _JsonFormatter()
        else:
            formatter = _TextFormatter()

        handler.setFormatter(formatter)
        root.addHandler(handler)
        root.setLevel(LOG_LEVEL)

    # ------------------------------------------------------------------
    # Generic levelled helpers
    # ------------------------------------------------------------------

    def debug(self, message: str, **kwargs: Any) -> None:
        self._logger.debug(message, extra=kwargs)

    def info(self, message: str, **kwargs: Any) -> None:
        self._logger.info(message, extra=kwargs)

    def warning(self, message: str, **kwargs: Any) -> None:
        self._logger.warning(message, extra=kwargs)

    def error(self, message: str, **kwargs: Any) -> None:
        self._logger.error(message, extra=kwargs)

    def critical(self, message: str, **kwargs: Any) -> None:
        self._logger.critical(message, extra=kwargs)

    def exception(self, message: str, **kwargs: Any) -> None:
        self._logger.exception(message, extra=kwargs)

    # ------------------------------------------------------------------
    # Semantic event helpers (evaluation deliverable D – log events)
    # ------------------------------------------------------------------

    def api_request_started(self, url: str, **kwargs: Any) -> None:
        """
        Log the moment an HTTP request to the notification API is initiated.

        Why log this?
        The elapsed-time measurement starts here; having both 'started' and
        'completed' events lets operations teams compute p99 latencies directly
        in a log query without touching metrics infrastructure.
        """
        self.info(
            "API request started",
            event="api_request_started",
            url=url,
            **kwargs,
        )

    def api_request_completed(
        self,
        url: str,
        status_code: int,
        duration_ms: float,
        notification_count: int,
        **kwargs: Any,
    ) -> None:
        """
        Log a successful API response.

        Fields
        ------
        status_code        – HTTP status returned.
        duration_ms        – Round-trip latency in milliseconds.
        notification_count – Number of raw records in the response payload.
        """
        self.info(
            "API request completed",
            event="api_request_completed",
            url=url,
            status_code=status_code,
            duration_ms=round(duration_ms, 2),
            notification_count=notification_count,
            **kwargs,
        )

    def api_request_failed(
        self,
        url: str,
        reason: str,
        attempt: int,
        max_attempts: int,
        **kwargs: Any,
    ) -> None:
        """
        Log an API failure before or after a retry.

        Fields
        ------
        reason       – Short human-readable failure description.
        attempt      – Which attempt number just failed (1-indexed).
        max_attempts – Total retry budget.
        """
        self.error(
            f"API request failed (attempt {attempt}/{max_attempts}): {reason}",
            event="api_request_failed",
            url=url,
            reason=reason,
            attempt=attempt,
            max_attempts=max_attempts,
            **kwargs,
        )

    def notification_processed(
        self,
        notification_id: str,
        notification_type: str,
        priority_score: int,
        **kwargs: Any,
    ) -> None:
        """
        Log every notification that passes all validation checks.

        Why log this?
        Gives a complete audit trail so engineers can replay which notifications
        were considered when debugging unexpected top-N results.
        """
        self.debug(
            f"Notification processed: id={notification_id} type={notification_type} "
            f"priority={priority_score}",
            event="notification_processed",
            notification_id=notification_id,
            notification_type=notification_type,
            priority_score=priority_score,
            **kwargs,
        )

    def notification_rejected(
        self,
        raw_data: dict,
        reason: str,
        **kwargs: Any,
    ) -> None:
        """
        Log every notification that fails validation (malformed, duplicate, etc.).

        Fields
        ------
        raw_data – The original dict so engineers can inspect the bad record.
        reason   – Why the record was rejected.
        """
        self.warning(
            f"Notification rejected: {reason}",
            event="notification_rejected",
            raw_data=raw_data,
            reason=reason,
            **kwargs,
        )

    def top_n_updated(
        self,
        top_n: int,
        heap_size: int,
        evicted_id: str | None,
        inserted_id: str,
        **kwargs: Any,
    ) -> None:
        """
        Log whenever the top-N heap changes (an item is inserted or evicted).

        Fields
        ------
        top_n       – The configured N value.
        heap_size   – Current number of elements in the heap after the update.
        evicted_id  – ID of the notification removed to make room (None if heap
                      was not yet full).
        inserted_id – ID of the notification that entered the heap.
        """
        self.info(
            f"Top-{top_n} heap updated: inserted={inserted_id} "
            f"evicted={evicted_id or 'none'} heap_size={heap_size}",
            event="top_n_updated",
            top_n=top_n,
            heap_size=heap_size,
            evicted_id=evicted_id,
            inserted_id=inserted_id,
            **kwargs,
        )


# ---------------------------------------------------------------------------
# Context-Timing Utility
# ---------------------------------------------------------------------------

class APIRequestTimer:
    """
    Context manager that measures wall-clock elapsed time for an API call
    and emits structured log events via a NotificationLogger.

    Usage
    -----
    with APIRequestTimer(logger, url="http://...") as timer:
        response = requests.get(url, ...)
        timer.set_response(response.status_code, len(data))
    # On normal exit  → logs api_request_completed
    # On exception    → logs api_request_failed  (re-raises the exception)
    """

    def __init__(self, logger: NotificationLogger, url: str, attempt: int = 1, max_attempts: int = 1) -> None:
        self._logger = logger
        self._url = url
        self._attempt = attempt
        self._max_attempts = max_attempts
        self._start: float = 0.0
        self._status_code: int = 0
        self._notification_count: int = 0

    def set_response(self, status_code: int, notification_count: int) -> None:
        """Call this after a successful HTTP response to capture metadata."""
        self._status_code = status_code
        self._notification_count = notification_count

    def __enter__(self) -> "APIRequestTimer":
        self._start = time.perf_counter()
        self._logger.api_request_started(url=self._url, attempt=self._attempt)
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> bool:
        duration_ms = (time.perf_counter() - self._start) * 1000

        if exc_type is None:
            self._logger.api_request_completed(
                url=self._url,
                status_code=self._status_code,
                duration_ms=duration_ms,
                notification_count=self._notification_count,
            )
        else:
            self._logger.api_request_failed(
                url=self._url,
                reason=str(exc_val),
                attempt=self._attempt,
                max_attempts=self._max_attempts,
            )

        return False  # Never suppress exceptions — let callers decide.
