"""
config.py
---------
Centralised configuration for the Notification Priority System.
All tuneable values live here so that no magic numbers appear in business logic.
"""

import os

# ---------------------------------------------------------------------------
# API Configuration
# ---------------------------------------------------------------------------
API_BASE_URL: str = os.getenv(
    "NOTIFICATION_API_URL",
    "http://4.224.186.213/evaluation-service/notifications",
)

# Bearer token injected via environment variable for security.
# Never hard-code credentials in source code.
API_TOKEN: str = os.getenv("NOTIFICATION_API_TOKEN", "")

# Number of seconds to wait for the API to respond before timing out.
API_TIMEOUT_SECONDS: int = int(os.getenv("API_TIMEOUT_SECONDS", "10"))

# ---------------------------------------------------------------------------
# Retry Configuration
# ---------------------------------------------------------------------------
MAX_RETRY_ATTEMPTS: int = int(os.getenv("MAX_RETRY_ATTEMPTS", "3"))

# Seconds to wait between successive retry attempts (exponential back-off base).
RETRY_BACKOFF_BASE_SECONDS: float = float(os.getenv("RETRY_BACKOFF_BASE_SECONDS", "1.0"))

# ---------------------------------------------------------------------------
# Priority Queue Configuration
# ---------------------------------------------------------------------------
# Default value for N (top-N notifications to maintain).
DEFAULT_TOP_N: int = int(os.getenv("DEFAULT_TOP_N", "5"))

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "DEBUG")
LOG_FORMAT: str = os.getenv("LOG_FORMAT", "json")   # "json" | "text"

# ---------------------------------------------------------------------------
# Priority Weights
# Each notification type maps to an integer weight.
# Higher weight  =>  higher priority.
# ---------------------------------------------------------------------------
TYPE_PRIORITY_WEIGHT: dict[str, int] = {
    "Placement": 300,
    "Result":    200,
    "Event":     100,
}
