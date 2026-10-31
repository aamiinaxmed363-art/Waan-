"""SQLite persistence for ZOUMFX VIP bot usage and plan selections."""

from __future__ import annotations

import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_DATABASE_PATH = Path(__file__).with_name("zoumfx_vip_usage.sqlite3")
EVENT_TYPES = {"open", "subscription", "invite"}


def initialize_database(db_path: str | Path = DEFAULT_DATABASE_PATH) -> None:
    """Create the local usage database and its indexes if they do not exist."""
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(path, timeout=15)) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                telegram_user_id INTEGER PRIMARY KEY,
                username TEXT,
                display_name TEXT NOT NULL,
                first_seen_at_utc TEXT NOT NULL,
                last_seen_at_utc TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_user_id INTEGER NOT NULL
                    REFERENCES users(telegram_user_id),
                event_type TEXT NOT NULL
                    CHECK (event_type IN ('open', 'subscription', 'invite')),
                plan_id TEXT,
                plan_label TEXT,
                username_snapshot TEXT,
                display_name_snapshot TEXT NOT NULL,
                created_at_utc TEXT NOT NULL,
                CHECK (
                    (event_type = 'open' AND plan_id IS NULL AND plan_label IS NULL)
                    OR
                    (event_type <> 'open' AND plan_id IS NOT NULL AND plan_label IS NOT NULL)
                )
            );

            CREATE INDEX IF NOT EXISTS idx_events_type_plan
                ON events(event_type, plan_id);

            CREATE INDEX IF NOT EXISTS idx_events_recent
                ON events(id DESC);

            CREATE TABLE IF NOT EXISTS channel_invites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_user_id INTEGER NOT NULL
                    REFERENCES users(telegram_user_id),
                channel_id INTEGER NOT NULL,
                plan_kind TEXT NOT NULL
                    CHECK (plan_kind IN ('subscription', 'invite')),
                plan_id TEXT NOT NULL,
                invite_hash TEXT NOT NULL UNIQUE,
                status TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'activated', 'cancelled')),
                created_at_utc TEXT NOT NULL,
                activated_at_utc TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_channel_invites_hash
                ON channel_invites(invite_hash);

            CREATE TABLE IF NOT EXISTS memberships (
                telegram_user_id INTEGER PRIMARY KEY
                    REFERENCES users(telegram_user_id),
                username TEXT,
                display_name TEXT NOT NULL,
                plan_id TEXT NOT NULL,
                plan_label TEXT NOT NULL,
                plan_kind TEXT NOT NULL
                    CHECK (plan_kind IN ('subscription', 'invite')),
                starts_at_utc TEXT NOT NULL,
                expires_at_utc TEXT,
                status TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'expired', 'scheduled')),
                updated_at_utc TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_memberships_expiry
                ON memberships(status, expires_at_utc);

            CREATE TABLE IF NOT EXISTS payment_submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_user_id INTEGER NOT NULL
                    REFERENCES users(telegram_user_id),
                username TEXT,
                display_name TEXT NOT NULL,
                plan_id TEXT NOT NULL,
                plan_label TEXT NOT NULL,
                wallet_address TEXT NOT NULL,
                screenshot_file_id TEXT NOT NULL,
                screenshot_media_type TEXT NOT NULL
                    CHECK (screenshot_media_type IN ('photo', 'document')),
                status TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'delivery_failed')),
                created_at_utc TEXT NOT NULL,
                reviewed_at_utc TEXT,
                reviewer_telegram_user_id INTEGER
            );

            CREATE INDEX IF NOT EXISTS idx_payment_submissions_status
                ON payment_submissions(status, id DESC);

            CREATE TABLE IF NOT EXISTS bot_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at_utc TEXT NOT NULL
            );
            """
        )
        # Migrate channel_invites if invite_link is missing
        columns = [
            row[1]
            for row in connection.execute("PRAGMA table_info(channel_invites)").fetchall()
        ]
        if "invite_link" not in columns:
            connection.execute("ALTER TABLE channel_invites ADD COLUMN invite_link TEXT")

        connection.commit()


def get_setting(db_path: str | Path, key: str, default: str | None = None) -> str | None:
    with closing(sqlite3.connect(db_path, timeout=15)) as connection:
        row = connection.execute(
            "SELECT value FROM bot_settings WHERE key = ?", (key,)
        ).fetchone()
        return row[0] if row else default


def set_setting(db_path: str | Path, key: str, value: str) -> None:
    now = utc_now()
    with closing(sqlite3.connect(db_path, timeout=15)) as connection:
        with connection:
            connection.execute(
                """
                INSERT INTO bot_settings (key, value, updated_at_utc)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at_utc = excluded.updated_at_utc
                """,
                (key, str(value), now),
            )


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def _upsert_user(
    connection: sqlite3.Connection,
    telegram_user_id: int,
    username: str | None,
    display_name: str,
    now: str,
) -> None:
    connection.execute(
        """
        INSERT INTO users (telegram_user_id, username, display_name, first_seen_at_utc, last_seen_at_utc)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(telegram_user_id) DO UPDATE SET
            username = excluded.username,
            display_name = excluded.display_name,
            last_seen_at_utc = excluded.last_seen_at_utc
        """,
        (telegram_user_id, username, display_name, now, now),
    )


def record_event(
    db_path: str | Path,
    telegram_user_id: int,
    username: str | None,
    display_name: str,
    event_type: str,
    plan_id: str | None = None,
    plan_label: str | None = None,
) -> None:
    if event_type not in EVENT_TYPES:
        raise ValueError(f"Invalid event_type: {event_type}")

    now = utc_now()
    clean_display = " ".join(display_name.split())[:128] or "not set"

    with closing(sqlite3.connect(db_path, timeout=15)) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        with connection:
            _upsert_user(connection, telegram_user_id, username, clean_display, now)
            connection.execute(
                """
                INSERT INTO events (
                    telegram_user_id,
                    event_type,
                    plan_id,
                    plan_label,
                    username_snapshot,
                    display_name_snapshot,
                    created_at_utc
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    telegram_user_id,
                    event_type,
                    plan_id,
                    plan_label,
                    username,
                    clean_display,
                    now,
                ),
            )


def create_payment_submission(
    db_path: str | Path,
    telegram_user_id: int,
    username: str | None,
    display_name: str,
    plan_id: str,
    plan_label: str,
    wallet_address: str,
    screenshot_file_id: str,
    screenshot_media_type: str,
) -> int:
    now = utc_now()
    clean_display = " ".join(display_name.split())[:128] or "not set"

    with closing(sqlite3.connect(db_path, timeout=15)) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        with connection:
            _upsert_user(connection, telegram_user_id, username, clean_display, now)
            cursor = connection.execute(
                """
                INSERT INTO payment_submissions (
                    telegram_user_id,
                    username,
                    display_name,
                    plan_id,
                    plan_label,
                    wallet_address,
                    screenshot_file_id,
                    screenshot_media_type,
                    status,
                    created_at_utc
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
                """,
                (
                    telegram_user_id,
                    username,
                    clean_display,
                    plan_id,
                    plan_label,
                    wallet_address,
                    screenshot_file_id,
                    screenshot_media_type,
                    now,
                ),
            )
            return cursor.lastrowid or 0


def get_payment_submission(
    db_path: str | Path,
    submission_id: int,
) -> dict[str, Any] | None:
    with closing(sqlite3.connect(db_path, timeout=15)) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            """
            SELECT * FROM payment_submissions WHERE id = ?
            """,
            (submission_id,),
        ).fetchone()
        return dict(row) if row else None


def mark_payment_delivery_failed(
    db_path: str | Path,
    submission_id: int,
) -> None:
    with closing(sqlite3.connect(db_path, timeout=15)) as connection:
        with connection:
            connection.execute(
                """
                UPDATE payment_submissions
                SET status = 'delivery_failed'
                WHERE id = ? AND status = 'pending'
                """,
                (submission_id,),
            )


def transition_payment_submission(
    db_path: str | Path,
    submission_id: int,
    status: str,
    reviewer_telegram_user_id: int,
) -> bool:
    if status not in {"approved", "rejected"}:
        raise ValueError("Invalid review status.")

    now = utc_now()
    with closing(sqlite3.connect(db_path, timeout=15)) as connection:
        with connection:
            cursor = connection.execute(
                """
                UPDATE payment_submissions
                SET status = ?,
                    reviewed_at_utc = ?,
                    reviewer_telegram_user_id = ?
                WHERE id = ? AND status = 'pending'
                """,
                (status, now, reviewer_telegram_user_id, submission_id),
            )
            return cursor.rowcount > 0


def read_stats(db_path: str | Path) -> dict[str, Any]:
    with closing(sqlite3.connect(db_path, timeout=15)) as connection:
        connection.row_factory = sqlite3.Row

        total_users = connection.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
        open_events = connection.execute(
            "SELECT COUNT(*) AS c FROM events WHERE event_type = 'open'"
        ).fetchone()["c"]
        total_selections = connection.execute(
            "SELECT COUNT(*) AS c FROM events WHERE event_type IN ('subscription', 'invite')"
        ).fetchone()["c"]

        plan_counts_rows = connection.execute(
            """
            SELECT event_type, plan_id,
                   COUNT(*) AS selections,
                   COUNT(DISTINCT telegram_user_id) AS unique_users
            FROM events
            WHERE event_type IN ('subscription', 'invite')
            GROUP BY event_type, plan_id
            """
        ).fetchall()
        plan_counts = {
            (r["event_type"], r["plan_id"]): {
                "selections": r["selections"],
                "unique_users": r["unique_users"],
            }
            for r in plan_counts_rows
        }

        recent_selections_rows = connection.execute(
            """
            SELECT telegram_user_id, username_snapshot, display_name_snapshot,
                   plan_label, created_at_utc
            FROM events
            WHERE event_type IN ('subscription', 'invite')
            ORDER BY id DESC
            LIMIT 10
            """
        ).fetchall()
        recent_selections = [dict(r) for r in recent_selections_rows]

        # Access counts
        active_memberships = connection.execute(
            "SELECT COUNT(*) AS c FROM memberships WHERE status = 'active'"
        ).fetchone()["c"]
        pending_invites = connection.execute(
            "SELECT COUNT(*) AS c FROM channel_invites WHERE status = 'pending'"
        ).fetchone()["c"]
        scheduled_memberships = connection.execute(
            "SELECT COUNT(*) AS c FROM memberships WHERE status = 'scheduled'"
        ).fetchone()["c"]
        expired_memberships = connection.execute(
            "SELECT COUNT(*) AS c FROM memberships WHERE status = 'expired'"
        ).fetchone()["c"]

        current_access_rows = connection.execute(
            """
            SELECT telegram_user_id, username, display_name, plan_label,
                   starts_at_utc, expires_at_utc, status
            FROM memberships
            WHERE status IN ('active', 'scheduled')
            ORDER BY starts_at_utc DESC
            """
        ).fetchall()
        current_access = [dict(r) for r in current_access_rows]

        return {
            "total_users": total_users,
            "open_events": open_events,
            "total_selections": total_selections,
            "plan_counts": plan_counts,
            "recent_selections": recent_selections,
            "access_summary": {
                "active_memberships": active_memberships,
                "pending_invites": pending_invites,
                "scheduled_memberships": scheduled_memberships,
                "expired_memberships": expired_memberships,
            },
            "current_access": current_access,
        }
