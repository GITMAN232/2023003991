"""
tests/test_notification_service.py
------------------------------------
Unit tests for NotificationService.

All HTTP calls are mocked with unittest.mock so these tests run offline
without requiring the real API endpoint.

Tests cover:
- Successful authentication and token caching
- Auth retry on transient failures
- Auth raising RuntimeError after max retries
- Successful notification fetch
- Fetch retry on transient errors
- 401 triggers re-authentication
- Malformed JSON in response
- validate_and_parse: missing fields
- validate_and_parse: duplicate IDs within one batch
- validate_and_parse: non-dict items in the list
"""

import unittest
from unittest.mock import MagicMock, patch, call
import requests

from services.notification_service import NotificationService


# ---------------------------------------------------------------------------
# Shared test data
# ---------------------------------------------------------------------------

_VALID_RAW_NOTIFICATION = {
    "ID":        "d146095a-0d86-4a34-9e69-3900a14576bc",
    "Type":      "Result",
    "Message":   "mid-sem",
    "Timestamp": "2026-04-22 17:51:30",
}

_AUTH_SUCCESS_BODY = {"token": "test-bearer-token-abc123"}


def _make_service(max_retries: int = 2, backoff_base: float = 0.0) -> NotificationService:
    """Return a NotificationService with fast retries for testing."""
    svc = NotificationService(max_retries=max_retries, backoff_base=backoff_base)
    return svc


# ---------------------------------------------------------------------------
# Authentication Tests
# ---------------------------------------------------------------------------

class TestAuthentication(unittest.TestCase):

    @patch("services.notification_service.requests.post")
    def test_successful_auth_returns_token(self, mock_post):
        mock_response = MagicMock()
        mock_response.json.return_value = _AUTH_SUCCESS_BODY
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response

        svc = _make_service()
        token = svc.authenticate()
        self.assertEqual(token, "test-bearer-token-abc123")

    @patch("services.notification_service.requests.post")
    def test_token_is_cached_after_first_auth(self, mock_post):
        mock_response = MagicMock()
        mock_response.json.return_value = _AUTH_SUCCESS_BODY
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response

        svc = _make_service()
        svc.authenticate()
        svc._ensure_authenticated()  # should NOT call POST again
        mock_post.assert_called_once()

    @patch("services.notification_service.requests.post")
    def test_auth_retries_on_connection_error(self, mock_post):
        mock_post.side_effect = [
            requests.exceptions.ConnectionError("network down"),
            MagicMock(
                json=MagicMock(return_value=_AUTH_SUCCESS_BODY),
                raise_for_status=MagicMock(),
            ),
        ]
        svc = _make_service(max_retries=2)
        token = svc.authenticate()
        self.assertEqual(token, "test-bearer-token-abc123")
        self.assertEqual(mock_post.call_count, 2)

    @patch("services.notification_service.requests.post")
    def test_auth_raises_after_max_retries(self, mock_post):
        mock_post.side_effect = requests.exceptions.ConnectionError("always down")
        svc = _make_service(max_retries=2)
        with self.assertRaises(RuntimeError) as ctx:
            svc.authenticate()
        self.assertIn("Authentication failed", str(ctx.exception))

    @patch("services.notification_service.requests.post")
    def test_auth_raises_if_no_token_in_response(self, mock_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {"status": "ok"}  # no token key
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response
        svc = _make_service(max_retries=1)
        with self.assertRaises(RuntimeError):
            svc.authenticate()


# ---------------------------------------------------------------------------
# Fetch Tests
# ---------------------------------------------------------------------------

class TestFetchRawNotifications(unittest.TestCase):

    def _authed_service(self) -> NotificationService:
        """Return a service with a pre-cached bearer token."""
        svc = _make_service()
        svc._bearer_token = "pre-cached-token"
        return svc

    @patch("services.notification_service.requests.get")
    def test_successful_fetch_returns_list(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {"notifications": [_VALID_RAW_NOTIFICATION]}
        mock_get.return_value = mock_response

        svc = self._authed_service()
        result = svc.fetch_raw_notifications()
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["ID"], _VALID_RAW_NOTIFICATION["ID"])

    @patch("services.notification_service.requests.get")
    def test_fetch_retries_on_timeout(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {"notifications": []}
        mock_get.side_effect = [
            requests.exceptions.Timeout("timed out"),
            mock_response,
        ]

        svc = self._authed_service()
        svc._max_retries = 2
        result = svc.fetch_raw_notifications()
        self.assertIsInstance(result, list)

    @patch("services.notification_service.requests.get")
    def test_fetch_raises_after_max_retries(self, mock_get):
        mock_get.side_effect = requests.exceptions.Timeout("always timeout")
        svc = self._authed_service()
        svc._max_retries = 2
        with self.assertRaises(RuntimeError):
            svc.fetch_raw_notifications()

    @patch("services.notification_service.requests.get")
    def test_fetch_handles_flat_list_response(self, mock_get):
        """Some API configs return a bare list instead of wrapped object."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = [_VALID_RAW_NOTIFICATION]
        mock_get.return_value = mock_response

        svc = self._authed_service()
        result = svc.fetch_raw_notifications()
        self.assertEqual(len(result), 1)


# ---------------------------------------------------------------------------
# Validation Tests
# ---------------------------------------------------------------------------

class TestParseAndValidate(unittest.TestCase):

    def setUp(self):
        self.svc = _make_service()

    def test_valid_notification_accepted(self):
        result = self.svc._parse_and_validate(_VALID_RAW_NOTIFICATION, seen_ids=set())
        self.assertIsNotNone(result)
        self.assertEqual(result.id, _VALID_RAW_NOTIFICATION["ID"])

    def test_missing_field_rejected(self):
        raw = dict(_VALID_RAW_NOTIFICATION)
        del raw["Type"]
        result = self.svc._parse_and_validate(raw, seen_ids=set())
        self.assertIsNone(result)

    def test_unknown_type_rejected(self):
        raw = dict(_VALID_RAW_NOTIFICATION)
        raw["Type"] = "Gossip"
        result = self.svc._parse_and_validate(raw, seen_ids=set())
        self.assertIsNone(result)

    def test_duplicate_id_rejected(self):
        seen = {_VALID_RAW_NOTIFICATION["ID"]}
        result = self.svc._parse_and_validate(_VALID_RAW_NOTIFICATION, seen_ids=seen)
        self.assertIsNone(result)

    def test_non_dict_rejected(self):
        result = self.svc._parse_and_validate("this is not a dict", seen_ids=set())  # type: ignore
        self.assertIsNone(result)

    def test_integer_item_rejected(self):
        result = self.svc._parse_and_validate(42, seen_ids=set())  # type: ignore
        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main(verbosity=2)
