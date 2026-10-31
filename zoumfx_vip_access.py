"""Access-term and private-channel membership persistence."""

from __future__ import annotations

import calendar
import hashlib
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PLAN_DURATION_MONTHS: dict[str, int | None] = {
    "monthly": 1,
    "half_year": 6,
    "yearly": 12,
    "lifetime": None,
}


def utc_timestamp(value: datetime) -> str:
    return value.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def parse_utc_timestamp(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%d %H:%M:%S UTC").replace(
        tzinfo=timezone.utc
    )


def add_calendar_months(value: datetime, months: int) -> datetime:
    """Add calendar months, clamping dates such as January 31 to month end."""
    if months < 1:
        raise ValueError("Calendar month increment must be positive.")
    month_index = value.year * 12 + value.month - 1 + months
    year, zero_based_month = divmod(month_index, 12)
    month = zero_based_month + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def invite_link_hash(invite_link: str) -> str:
    """Store a digest rather than the private invite URL itself."""
    return hashlib.sha256(invite_link.encode("utf-8")).hexdigest()


def is_tracked_user(db_path: str | Path, telegram_user_id: int) -> bool:
    with closing(sqlite3.connect(db_path, timeout=15)) as connection:
        row = connection.execute(
            "SELECT 1 FROM users WHERE telegram_user_id = ?",
            (telegram_user_id,),
        ).fetchone()
    return row is not None


def latest_plan_selection(
    db_path: str | Path,
    telegram_user_id: int,
) -> dict[str, Any] | None:
    with closing(sqlite3.connect(db_path, timeout=15)) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            """
            SELECT plan_id, plan_label, event_type AS plan_kind, created_at_utc
            FROM events
            WHERE telegram_user_id = ? AND event_type IN ('subscription', 'invite')
            ORDER BY id DESC
            LIMIT 1
            """,
            (telegram_user_id,),
        ).fetchone()
        return dict(row) if row else None


def create_pending_invite(
    db_path: str | Path,
    telegram_user_id: int,
    channel_id: int,
    plan_kind: str,
    plan_id: str,
    invite_link: str,
) -> int:
    hash_value = invite_link_hash(invite_link)
    now = utc_timestamp(datetime.now(timezone.utc))
    with closing(sqlite3.connect(db_path, timeout=15)) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        with connection:
            connection.execute(
                """
                INSERT INTO users (telegram_user_id, display_name, first_seen_at_utc, last_seen_at_utc)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(telegram_user_id) DO UPDATE SET last_seen_at_utc = excluded.last_seen_at_utc
                """,
                (telegram_user_id, f"User {telegram_user_id}", now, now),
            )
            cursor = connection.execute(
                """
                INSERT INTO channel_invites (
                    telegram_user_id, channel_id, plan_kind, plan_id,
                    invite_hash, invite_link, status, created_at_utc
                )
                VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
                """,
                (
                    telegram_user_id,
                    channel_id,
                    plan_kind,
                    plan_id,
                    hash_value,
                    invite_link,
                    now,
                ),
            )
            return cursor.lastrowid or 0


def invite_by_hash(
    db_path: str | Path,
    invite_hash: str,
) -> dict[str, Any] | None:
    with closing(sqlite3.connect(db_path, timeout=15)) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            "SELECT * FROM channel_invites WHERE invite_hash = ?",
            (invite_hash,),
        ).fetchone()
        return dict(row) if row else None


def activate_invite(
    db_path: str | Path,
    invite_hash: str,
) -> bool:
    now = utc_timestamp(datetime.now(timezone.utc))
    with closing(sqlite3.connect(db_path, timeout=15)) as connection:
        with connection:
            cursor = connection.execute(
                """
                UPDATE channel_invites
                SET status = 'activated', activated_at_utc = ?
                WHERE invite_hash = ? AND status = 'pending'
                """,
                (now, invite_hash),
            )
            return cursor.rowcount > 0


def cancel_pending_invites(
    db_path: str | Path,
    telegram_user_id: int,
) -> None:
    with closing(sqlite3.connect(db_path, timeout=15)) as connection:
        with connection:
            connection.execute(
                """
                UPDATE channel_invites
                SET status = 'cancelled'
                WHERE telegram_user_id = ? AND status = 'pending'
                """,
                (telegram_user_id,),
            )


def mark_invite_status(
    db_path: str | Path,
    invite_id: int,
    status: str,
) -> None:
    with closing(sqlite3.connect(db_path, timeout=15)) as connection:
        with connection:
            connection.execute(
                "UPDATE channel_invites SET status = ? WHERE id = ?",
                (status, invite_id),
            )


def get_membership(
    db_path: str | Path,
    telegram_user_id: int,
) -> dict[str, Any] | None:
    with closing(sqlite3.connect(db_path, timeout=15)) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            "SELECT * FROM memberships WHERE telegram_user_id = ?",
            (telegram_user_id,),
        ).fetchone()
        return dict(row) if row else None


def set_membership(
    db_path: str | Path,
    telegram_user_id: int,
    username: str | None,
    display_name: str,
    plan_id: str,
    plan_label: str,
    plan_kind: str,
    starts_at_utc: str,
    expires_at_utc: str | None,
    status: str = "active",
) -> None:
    now = utc_timestamp(datetime.now(timezone.utc))
    with closing(sqlite3.connect(db_path, timeout=15)) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        with connection:
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
            connection.execute(
                """
                INSERT INTO memberships (
                    telegram_user_id, username, display_name, plan_id, plan_label,
                    plan_kind, starts_at_utc, expires_at_utc, status, updated_at_utc
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(telegram_user_id) DO UPDATE SET
                    username = excluded.username,
                    display_name = excluded.display_name,
                    plan_id = excluded.plan_id,
                    plan_label = excluded.plan_label,
                    plan_kind = excluded.plan_kind,
                    starts_at_utc = excluded.starts_at_utc,
                    expires_at_utc = excluded.expires_at_utc,
                    status = excluded.status,
                    updated_at_utc = excluded.updated_at_utc
                """,
                (
                    telegram_user_id,
                    username,
                    display_name,
                    plan_id,
                    plan_label,
                    plan_kind,
                    starts_at_utc,
                    expires_at_utc,
                    status,
                    now,
                ),
            )


def expired_memberships(
    db_path: str | Path,
    now_utc: datetime | None = None,
) -> list[dict[str, Any]]:
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)
    now_str = utc_timestamp(now_utc)
    with closing(sqlite3.connect(db_path, timeout=15)) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT * FROM memberships
            WHERE status = 'active'
              AND plan_id <> 'lifetime'
              AND expires_at_utc IS NOT NULL
              AND expires_at_utc <= ?
            """,
            (now_str,),
        ).fetchall()
        return [dict(r) for r in rows]


def mark_membership_expired(
    db_path: str | Path,
    telegram_user_id: int,
) -> None:
    now = utc_timestamp(datetime.now(timezone.utc))
    with closing(sqlite3.connect(db_path, timeout=15)) as connection:
        with connection:
            connection.execute(
                """
                UPDATE memberships
                SET status = 'expired', updated_at_utc = ?
                WHERE telegram_user_id = ?
                """,
                (now, telegram_user_id),
            )
