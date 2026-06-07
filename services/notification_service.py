"""
services/notification_service.py
----------------------------------
Responsible for all network I/O with the evaluation API.

Responsibilities
----------------
1. Authenticate against POST /evaluation-service/auth to obtain a Bearer token.
2. Fetch raw notification payloads from GET /evaluation-service/notifications.
3. Deserialise each raw record into a validated Notification object.
4. Apply retry logic with exponential back-off on transient failures.
5. Detect and skip duplicate notification IDs within a single fetch cycle.
6. Emit structured log events via NotificationLogger for every significant step.

This class deliberately contains NO priority logic.  Separation of concerns:
    NotificationService  → fetch & validate
    PriorityNotificationManager → rank & maintain top-N
"""

from __future__ import annotations

import time
from typing import Iterator

import requests

from config import (
    API_BASE_URL,
    API_TIMEOUT_SECONDS,
    MAX_RETRY_ATTEMPTS,
    RETRY_BACKOFF_BASE_SECONDS,
)
from middleware.logging_middleware import APIRequestTimer, NotificationLogger
from models.notification import Notification

# ---------------------------------------------------------------------------
# Auth endpoint (derived from the same base host)
# ---------------------------------------------------------------------------
_AUTH_URL: str = "http://4.224.186.213/evaluation-service/auth"

# Credentials supplied for this evaluation candidate.
_AUTH_PAYLOAD: dict = {
    "email":        "spachipa2@gitam.in",
    "name":         "P.Santhosh",
    "rollNo":       "2023003991",
    "accessCode":   "wgKtgZ",
    "clientID":     "280a8b72-8b83-48fd-bb00-98f758d259d2",
    "clientSecret": "NVkYJJPrVbzfVdVG",
}


class NotificationService:
    """
    Handles authentication and notification retrieval from the remote API.

    Parameters
    ----------
    api_url : str
        Full URL of the notifications endpoint.  Defaults to config value.
    timeout : int
        Per-request timeout in seconds.
    max_retries : int
        Total retry attempts on failure before giving up.
    backoff_base : float
        Base seconds for exponential back-off: sleep = backoff_base * 2^(attempt-1)
    """

    def __init__(
        self,
        api_url: str = API_BASE_URL,
        timeout: int = API_TIMEOUT_SECONDS,
        max_retries: int = MAX_RETRY_ATTEMPTS,
        backoff_base: float = RETRY_BACKOFF_BASE_SECONDS,
    ) -> None:
        self._api_url: str = api_url
        self._timeout: int = timeout
        self._max_retries: int = max_retries
        self._backoff_base: float = backoff_base
        self._logger: NotificationLogger = NotificationLogger(__name__)

        # Bearer token cached after the first successful auth call.
        self._bearer_token: str | None = None

    # ------------------------------------------------------------------
    # Authentication
    # ------------------------------------------------------------------

    def authenticate(self) -> str:
        """
        POST credentials to the auth endpoint and cache the returned Bearer token.

        Returns
        -------
        str
            The Bearer token string.

        Raises
        ------
        RuntimeError
            If authentication fails after all retry attempts.
        """
        self._logger.info(
            "Authenticating with evaluation service",
            event="auth_started",
            url=_AUTH_URL,
            email=_AUTH_PAYLOAD["email"],
        )

        for attempt in range(1, self._max_retries + 1):
            try:
                with APIRequestTimer(self._logger, url=_AUTH_URL, attempt=attempt,
                                     max_attempts=self._max_retries):
                    response = requests.post(
                        _AUTH_URL,
                        json=_AUTH_PAYLOAD,
                        timeout=self._timeout,
                    )
                    response.raise_for_status()
                    body = response.json()

                # The token may live under different keys depending on the server.
                token: str | None = (
                    body.get("token")
                    or body.get("accessToken")
                    or body.get("access_token")
                    or body.get("Bearer")
                )

                if not token:
                    raise ValueError(
                        f"Auth response does not contain a token field. "
                        f"Keys received: {list(body.keys())}"
                    )

                self._bearer_token = token
                self._logger.info(
                    "Authentication successful",
                    event="auth_success",
                    token_preview=f"{token[:8]}...",
                )
                return token

            except (requests.RequestException, ValueError) as exc:
                self._logger.api_request_failed(
                    url=_AUTH_URL,
                    reason=str(exc),
                    attempt=attempt,
                    max_attempts=self._max_retries,
                )
                if attempt < self._max_retries:
                    sleep_seconds = self._backoff_base * (2 ** (attempt - 1))
                    self._logger.info(
                        f"Retrying auth in {sleep_seconds:.1f}s",
                        event="auth_retry",
                        sleep_seconds=sleep_seconds,
                    )
                    time.sleep(sleep_seconds)

        raise RuntimeError(
            f"Authentication failed after {self._max_retries} attempt(s). "
            "Cannot proceed without a valid Bearer token."
        )

    def _ensure_authenticated(self) -> str:
        """Return cached token, re-authenticating if necessary."""
        if not self._bearer_token:
            return self.authenticate()
        return self._bearer_token

    # ------------------------------------------------------------------
    # Notification Fetching
    # ------------------------------------------------------------------

    def fetch_raw_notifications(self) -> list[dict]:
        """
        Fetch the raw notification payload from the API with retry logic.

        Returns
        -------
        list[dict]
            List of raw notification dictionaries exactly as returned by the API.

        Raises
        ------
        RuntimeError
            If all retry attempts are exhausted.
        """
        token = self._ensure_authenticated()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type":  "application/json",
            "Accept":        "application/json",
        }

        last_exception: Exception | None = None

        for attempt in range(1, self._max_retries + 1):
            try:
                with APIRequestTimer(
                    self._logger,
                    url=self._api_url,
                    attempt=attempt,
                    max_attempts=self._max_retries,
                ) as timer:
                    response = requests.get(
                        self._api_url,
                        headers=headers,
                        timeout=self._timeout,
                    )
                    response.raise_for_status()
                    body = response.json()

                # The API wraps the list under a "notifications" key.
                raw_list: list[dict] = body if isinstance(body, list) else body.get("notifications", [])
                timer.set_response(response.status_code, len(raw_list))
                return raw_list

            except requests.exceptions.Timeout as exc:
                last_exception = exc
                self._logger.api_request_failed(
                    url=self._api_url,
                    reason=f"Request timed out after {self._timeout}s",
                    attempt=attempt,
                    max_attempts=self._max_retries,
                )

            except requests.exceptions.ConnectionError as exc:
                last_exception = exc
                self._logger.api_request_failed(
                    url=self._api_url,
                    reason=f"Connection error: {exc}",
                    attempt=attempt,
                    max_attempts=self._max_retries,
                )

            except requests.exceptions.HTTPError as exc:
                last_exception = exc
                status = exc.response.status_code if exc.response else "unknown"
                # 401 → token may have expired; force re-authentication.
                if status == 401:
                    self._logger.warning(
                        "Received 401 – invalidating cached token and re-authenticating",
                        event="token_expired",
                    )
                    self._bearer_token = None
                    token = self._ensure_authenticated()
                    headers["Authorization"] = f"Bearer {token}"
                self._logger.api_request_failed(
                    url=self._api_url,
                    reason=f"HTTP {status}: {exc}",
                    attempt=attempt,
                    max_attempts=self._max_retries,
                )

            except ValueError as exc:
                # JSON decoding failure — response body is not valid JSON.
                last_exception = exc
                self._logger.api_request_failed(
                    url=self._api_url,
                    reason=f"Invalid JSON in response: {exc}",
                    attempt=attempt,
                    max_attempts=self._max_retries,
                )

            if attempt < self._max_retries:
                sleep_seconds = self._backoff_base * (2 ** (attempt - 1))
                self._logger.info(
                    f"Retrying fetch in {sleep_seconds:.1f}s",
                    event="fetch_retry",
                    attempt=attempt,
                    sleep_seconds=sleep_seconds,
                )
                time.sleep(sleep_seconds)

        raise RuntimeError(
            f"Failed to fetch notifications after {self._max_retries} attempt(s). "
            f"Last error: {last_exception}"
        )

    # ------------------------------------------------------------------
    # Validation & Deserialisation
    # ------------------------------------------------------------------

    def fetch_validated_notifications(self) -> list[Notification]:
        """
        Fetch, validate, and deserialise all unread notifications.

        Processing pipeline
        -------------------
        1. fetch_raw_notifications()  → list[dict]
        2. For each dict:
             a. Try Notification.from_dict(raw) → may raise ValueError
             b. Check for duplicate IDs within this batch
             c. Log accepted / rejected outcome
        3. Return only successfully parsed, non-duplicate Notification objects.

        Returns
        -------
        list[Notification]
            Validated, deduplicated notifications ready for priority processing.
        """
        self._logger.info(
            "Starting notification fetch and validation cycle",
            event="fetch_cycle_started",
            url=self._api_url,
        )

        raw_records: list[dict] = self.fetch_raw_notifications()
        validated: list[Notification] = []
        seen_ids: set[str] = set()   # Deduplication within this batch.

        for raw in raw_records:
            notification = self._parse_and_validate(raw, seen_ids)
            if notification is not None:
                validated.append(notification)
                seen_ids.add(notification.id)

        self._logger.info(
            "Fetch and validation cycle complete",
            event="fetch_cycle_complete",
            total_raw=len(raw_records),
            total_validated=len(validated),
            total_rejected=len(raw_records) - len(validated),
        )

        return validated

    def _parse_and_validate(
        self,
        raw: dict,
        seen_ids: set[str],
    ) -> Notification | None:
        """
        Attempt to parse *raw* into a Notification.

        Returns None (and logs a rejection) if:
        - The raw record is not a dictionary.
        - Required fields are missing.
        - The notification type is unknown.
        - The ID has already been seen in this batch (duplicate).

        Returns a Notification on success (and logs it as processed).
        """
        # Guard: raw must be a dict.
        if not isinstance(raw, dict):
            self._logger.notification_rejected(
                raw_data={"value": str(raw)},
                reason=f"Expected dict, got {type(raw).__name__}",
            )
            return None

        # Guard: must not be a duplicate.
        candidate_id = str(raw.get("ID", "")).strip()
        if candidate_id and candidate_id in seen_ids:
            self._logger.notification_rejected(
                raw_data=raw,
                reason=f"Duplicate notification ID: {candidate_id}",
            )
            return None

        # Attempt full deserialisation.
        try:
            notification = Notification.from_dict(raw)
        except ValueError as exc:
            self._logger.notification_rejected(
                raw_data=raw,
                reason=str(exc),
            )
            return None

        # Success — log and return.
        self._logger.notification_processed(
            notification_id=notification.id,
            notification_type=notification.type,
            priority_score=notification.priority_score,
        )
        return notification

    # ------------------------------------------------------------------
    # Streaming / Continuous Fetch Interface
    # ------------------------------------------------------------------

    def stream_notifications(
        self,
        poll_interval_seconds: float = 30.0,
    ) -> Iterator[list[Notification]]:
        """
        Generator that continuously fetches new notifications at a configurable
        poll interval.

        This enables the PriorityNotificationManager to process new batches as
        they arrive without reprocessing all historical data.

        Parameters
        ----------
        poll_interval_seconds : float
            How often to poll the API.

        Yields
        ------
        list[Notification]
            Each yield contains the batch of validated notifications from one
            API call.  The caller decides whether to feed these into the heap.
        """
        self._logger.info(
            "Starting continuous notification stream",
            event="stream_started",
            poll_interval_seconds=poll_interval_seconds,
        )

        while True:
            try:
                batch = self.fetch_validated_notifications()
                yield batch
            except RuntimeError as exc:
                self._logger.error(
                    f"Stream fetch failed: {exc}",
                    event="stream_fetch_error",
                )
                # On persistent failure, yield an empty batch and keep polling.
                yield []

            time.sleep(poll_interval_seconds)
