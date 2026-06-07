"""
main.py
-------
Entry point for Stage 1 of the Campus Notifications Microservice.

Execution Flow
--------------
1.  Parse --top-n argument (default: 10 as specified in the evaluation).
2.  Authenticate with the evaluation service to obtain a Bearer token.
3.  Fetch and validate all notifications from the API.
4.  Feed them into the PriorityNotificationManager (min-heap).
5.  Print the top-N highest-priority unread notifications to stdout.

Usage
-----
    python main.py                  # top 10 (default)
    python main.py --top-n 5        # top 5
    python main.py --top-n 20       # top 20

Environment Variables
---------------------
    LOG_LEVEL   DEBUG | INFO | WARNING | ERROR   (default: DEBUG)
    LOG_FORMAT  json | text                      (default: json)
"""

from __future__ import annotations

import argparse
import json
import sys

from config import DEFAULT_TOP_N
from middleware.logging_middleware import NotificationLogger
from models.notification import Notification
from services.notification_service import NotificationService
from services.priority_notification_manager import PriorityNotificationManager

# Module-level logger — first call configures the root logger.
logger = NotificationLogger(__name__)


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Campus Notification Priority Inbox — Stage 1",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py
  python main.py --top-n 5
  python main.py --top-n 20
        """,
    )
    parser.add_argument(
        "--top-n",
        type=int,
        default=DEFAULT_TOP_N,
        metavar="N",
        help=f"Number of top-priority notifications to display (default: {DEFAULT_TOP_N})",
    )
    return parser.parse_args()


def display_top_notifications(top_notifications: list[Notification], top_n: int) -> None:
    """
    Print the top-N notifications to stdout in a clear, readable format.

    Each record is printed as pretty-printed JSON so the output is both
    human-readable and machine-parseable by downstream tools.
    """
    separator = "=" * 70
    print(f"\n{separator}")
    print(f"  TOP {top_n} PRIORITY UNREAD NOTIFICATIONS")
    print(f"  Priority Order: Placement > Result > Event")
    print(f"  Within same type: Newer notifications rank higher")
    print(separator)

    if not top_notifications:
        print("\n  No unread notifications available.\n")
        print(separator)
        return

    for rank, notification in enumerate(top_notifications, start=1):
        record = notification.to_dict()
        print(f"\n  Rank #{rank}")
        print(f"  {'-' * 40}")
        print(f"  ID       : {record['id']}")
        print(f"  Type     : {record['type']}")
        print(f"  Message  : {record['message']}")
        print(f"  Timestamp: {record['timestamp']}")
        print(f"  Priority : {record['priority_score']}")

    print(f"\n{separator}\n")


def run(top_n: int) -> list[Notification]:
    """
    Main orchestration function.

    Parameters
    ----------
    top_n : int
        How many top-priority notifications to return.

    Returns
    -------
    list[Notification]
        The top-N notifications sorted highest-priority first.
    """
    logger.info(
        "Campus Notification Priority Inbox — Stage 1 started",
        event="application_started",
        top_n=top_n,
    )

    # ------------------------------------------------------------------ #
    # Step 1: Initialise components                                        #
    # ------------------------------------------------------------------ #
    service = NotificationService()
    manager = PriorityNotificationManager(top_n=top_n)

    # ------------------------------------------------------------------ #
    # Step 2: Authenticate                                                 #
    # ------------------------------------------------------------------ #
    try:
        service.authenticate()
    except RuntimeError as exc:
        logger.critical(
            f"Authentication failed — cannot proceed: {exc}",
            event="application_aborted",
            reason="auth_failure",
        )
        sys.exit(1)

    # ------------------------------------------------------------------ #
    # Step 3: Fetch & validate notifications                               #
    # ------------------------------------------------------------------ #
    try:
        notifications = service.fetch_validated_notifications()
    except RuntimeError as exc:
        logger.critical(
            f"Notification fetch failed — cannot proceed: {exc}",
            event="application_aborted",
            reason="fetch_failure",
        )
        sys.exit(1)

    # ------------------------------------------------------------------ #
    # Step 4: Build the priority heap                                      #
    # ------------------------------------------------------------------ #
    batch_summary = manager.push_batch(notifications)
    heap_info = {**batch_summary, **manager.heap_summary()}
    logger.info(
        "Priority heap built",
        event="heap_built",
        **heap_info,
    )

    # ------------------------------------------------------------------ #
    # Step 5: Retrieve & display top-N                                     #
    # ------------------------------------------------------------------ #
    top_notifications = manager.get_top_n()

    display_top_notifications(top_notifications, top_n)

    logger.info(
        "Stage 1 complete",
        event="application_complete",
        top_n_returned=len(top_notifications),
    )

    return top_notifications


def main() -> None:
    args = parse_args()
    run(top_n=args.top_n)


if __name__ == "__main__":
    main()
