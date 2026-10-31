"""Telegram inline-menu bot for the ZOUMFX VIP community."""

from __future__ import annotations

import asyncio
import logging
import os
import sqlite3
import time
from collections.abc import Sequence
from contextlib import closing
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from telegram import (
    ChatMemberUpdated,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Update,
)
from telegram.error import InvalidToken, NetworkError, RetryAfter, TelegramError
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    ChatJoinRequestHandler,
    ChatMemberHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from zoumfx_vip_config import (
    INVITE_CONFIRMATION_MESSAGE,
    INVITE_MENU_MESSAGE,
    INVITE_PLANS,
    SUBSCRIPTION_CONFIRMATION_MESSAGE,
    SUBSCRIPTION_MENU_MESSAGE,
    SUBSCRIPTION_PLANS,
    VIP_MENU_MESSAGE,
    WELCOME_MESSAGE,
)
from zoumfx_vip_access import (
    PLAN_DURATION_MONTHS,
    activate_invite,
    add_calendar_months,
    cancel_pending_invites,
    create_pending_invite,
    expired_memberships,
    get_membership,
    invite_by_hash,
    invite_link_hash,
    is_tracked_user,
    latest_plan_selection,
    mark_invite_status,
    mark_membership_expired,
    parse_utc_timestamp,
    set_membership,
    utc_timestamp,
)
from zoumfx_vip_usage import (
    DEFAULT_DATABASE_PATH,
    get_setting,
    initialize_database,
    read_stats,
    record_event,
    set_setting,
)
from zoumfx_vip_payments import (
    cancel_payment_command,
    payment_callback_handler,
    payment_message_handler,
    payment_plan_keyboard,
    payment_review_callback,
)

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    level=logging.INFO,
)
logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger("zoumfx_vip_bot")

Plan = dict[str, str]
DISPLAY_TIMEZONE = timezone(timedelta(hours=3), "UTC+3")


def _plans_by_id(plans: Sequence[Plan]) -> dict[str, Plan]:
    return {plan["id"]: plan for plan in plans}


_SUBSCRIPTION_PLANS_BY_ID = _plans_by_id(SUBSCRIPTION_PLANS)
_INVITE_PLANS_BY_ID = _plans_by_id(INVITE_PLANS)


def validate_plan_configuration() -> None:
    """Fail early if a plan is missing fields or the four-option menus drift."""
    required_fields = {
        "subscription": {"id", "name", "price"},
        "invite": {"id", "name", "requirement"},
    }
    for label, plans, fields in (
        ("subscription", SUBSCRIPTION_PLANS, required_fields["subscription"]),
        ("invite", INVITE_PLANS, required_fields["invite"]),
    ):
        if len(plans) != 4:
            raise ValueError(f"Expected exactly four {label} plans.")
        if len({plan.get("id") for plan in plans}) != 4:
            raise ValueError(f"Each {label} plan must have a unique id.")
        for plan in plans:
            missing = fields - plan.keys()
            if missing:
                raise ValueError(
                    f"{label.title()} plan {plan.get('id', '<unknown>')} "
                    f"is missing: {', '.join(sorted(missing))}"
                )


def start_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [[InlineKeyboardButton("💎 VIP PLANS", callback_data="nav:vip")]]
    )


def vip_menu_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton(
                    "Subscription Plans", callback_data="nav:subscriptions"
                )
            ],
            [InlineKeyboardButton("Invite Plans", callback_data="nav:invites")],
            [InlineKeyboardButton("Back", callback_data="nav:welcome")],
        ]
    )


def subscription_list_keyboard() -> InlineKeyboardMarkup:
    rows = [
        [
            InlineKeyboardButton(
                f"{plan['name']} — {plan['price']}",
                callback_data=f"sub:{plan['id']}",
            )
        ]
        for plan in SUBSCRIPTION_PLANS
    ]
    rows.append([InlineKeyboardButton("Back", callback_data="nav:vip")])
    return InlineKeyboardMarkup(rows)


def invite_list_keyboard() -> InlineKeyboardMarkup:
    rows = [
        [
            InlineKeyboardButton(
                f"{plan['name']} — {plan['requirement']}",
                callback_data=f"invite:{plan['id']}",
            )
        ]
        for plan in INVITE_PLANS
    ]
    rows.append([InlineKeyboardButton("Back", callback_data="nav:vip")])
    return InlineKeyboardMarkup(rows)


def back_keyboard(callback_data: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [[InlineKeyboardButton("Back", callback_data=callback_data)]]
    )


async def start_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    _record_open_event(update, context)
    if update.effective_message:
        await update.effective_message.reply_text(
            WELCOME_MESSAGE,
            reply_markup=start_keyboard(),
        )


async def help_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    _record_open_event(update, context)
    if update.effective_message:
        await update.effective_message.reply_text(
            WELCOME_MESSAGE,
            reply_markup=start_keyboard(),
        )


def _screen_for_callback(callback_data: str) -> tuple[str, InlineKeyboardMarkup]:
    if callback_data == "nav:welcome":
        return WELCOME_MESSAGE, start_keyboard()
    if callback_data == "nav:vip":
        return VIP_MENU_MESSAGE, vip_menu_keyboard()
    if callback_data == "nav:subscriptions":
        return SUBSCRIPTION_MENU_MESSAGE, subscription_list_keyboard()
    if callback_data == "nav:invites":
        return INVITE_MENU_MESSAGE, invite_list_keyboard()

    if callback_data.startswith("sub:"):
        plan = _SUBSCRIPTION_PLANS_BY_ID.get(callback_data.partition(":")[2])
        if plan:
            return (
                SUBSCRIPTION_CONFIRMATION_MESSAGE,
                payment_plan_keyboard(plan["id"]),
            )

    if callback_data.startswith("invite:"):
        plan = _INVITE_PLANS_BY_ID.get(callback_data.partition(":")[2])
        if plan:
            return INVITE_CONFIRMATION_MESSAGE, back_keyboard("nav:invites")

    return (
        WELCOME_MESSAGE,
        start_keyboard(),
    )


async def button_handler(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    query = update.callback_query
    if query is None:
        return

    callback_data = query.data or ""
    if callback_data.startswith("payment:"):
        await payment_callback_handler(update, context)
        return
    if callback_data.startswith("pay:"):
        await payment_review_callback(update, context)
        return

    await query.answer()
    _record_plan_selection(update, context, callback_data)
    text, keyboard = _screen_for_callback(callback_data)
    await query.edit_message_text(text=text, reply_markup=keyboard)


def _database_path(context: ContextTypes.DEFAULT_TYPE) -> Path:
    return Path(context.bot_data.get("usage_db_path", DEFAULT_DATABASE_PATH))


def _record_open_event(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    user = update.effective_user
    if user is None:
        return
    _record_event_safely(
        context,
        telegram_user_id=user.id,
        username=user.username,
        display_name=user.full_name,
        event_type="open",
    )


def _record_plan_selection(
    update: Update, context: ContextTypes.DEFAULT_TYPE, callback_data: str
) -> None:
    user = update.effective_user
    if user is None:
        return

    if callback_data.startswith("sub:"):
        plan = _SUBSCRIPTION_PLANS_BY_ID.get(callback_data.partition(":")[2])
        if plan:
            _record_event_safely(
                context,
                telegram_user_id=user.id,
                username=user.username,
                display_name=user.full_name,
                event_type="subscription",
                plan_id=plan["id"],
                plan_label=f"{plan['name']} — {plan['price']}",
            )
    elif callback_data.startswith("invite:"):
        plan = _INVITE_PLANS_BY_ID.get(callback_data.partition(":")[2])
        if plan:
            _record_event_safely(
                context,
                telegram_user_id=user.id,
                username=user.username,
                display_name=user.full_name,
                event_type="invite",
                plan_id=plan["id"],
                plan_label=f"{plan['name']} — {plan['requirement']}",
            )


def _record_event_safely(
    context: ContextTypes.DEFAULT_TYPE,
    **event: Any,
) -> None:
    try:
        record_event(db_path=_database_path(context), **event)
    except (OSError, sqlite3.Error, ValueError) as error:
        logger.error("Usage tracking failed (%s).", type(error).__name__)


async def my_id_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    del context
    user = update.effective_user
    message = update.effective_message
    chat = update.effective_chat
    if user is None or message is None:
        return
    if chat is None or chat.type != "private":
        await message.reply_text("Please use /myid in a private chat.")
        return

    username = f"\nUsername: @{user.username}" if user.username else ""
    await message.reply_text(f"Your Telegram user ID: {user.id}{username}")


def _configured_admin_id(context: ContextTypes.DEFAULT_TYPE) -> int | None:
    raw_admin_id = context.bot_data.get("admin_user_id")
    if raw_admin_id is None:
        raw_admin_id = os.environ.get("ADMIN_TELEGRAM_USER_ID")
    try:
        admin_id = int(raw_admin_id)
    except (TypeError, ValueError):
        return None
    return admin_id if admin_id > 0 else None


def format_stats_report(stats: dict[str, Any]) -> str:
    lines = [
        "📊 ZOUMFX VIP Bot Stats",
        f"👥 Unique users: {stats['total_users']}",
        f"▶️ Opens (/start and /help): {stats['open_events']}",
        f"💎 Plan selections: {stats['total_selections']}",
        "",
        "Subscription plans:",
    ]
    for plan in SUBSCRIPTION_PLANS:
        entry = stats["plan_counts"].get(("subscription", plan["id"]), {})
        selections = entry.get("selections", 0)
        unique_users = entry.get("unique_users", 0)
        lines.append(
            f"• {plan['name']} — {plan['price']}: "
            f"{selections} selection{'s' if selections != 1 else ''}, "
            f"{unique_users} {'people' if unique_users != 1 else 'person'}"
        )

    lines.extend(["", "Invite plans:"])
    for plan in INVITE_PLANS:
        entry = stats["plan_counts"].get(("invite", plan["id"]), {})
        selections = entry.get("selections", 0)
        unique_users = entry.get("unique_users", 0)
        lines.append(
            f"• {plan['name']} — {plan['requirement']}: "
            f"{selections} selection{'s' if selections != 1 else ''}, "
            f"{unique_users} {'people' if unique_users != 1 else 'person'}"
        )

    lines.extend(["", "Recent plan selections:"])
    if not stats["recent_selections"]:
        lines.append("• No plan selections yet.")
    else:
        for event in stats["recent_selections"]:
            if event["username_snapshot"]:
                person = f"@{event['username_snapshot']}"
            else:
                person = event["display_name_snapshot"]
            lines.append(
                f"• {person} (ID {event['telegram_user_id']}) — "
                f"{event['plan_label']} — "
                f"{format_stats_timestamp(event['created_at_utc'])}"
            )
    access = stats.get("access_summary", {})
    lines.extend(
        [
            "",
            "Private channel access:",
            f"• Active: {access.get('active_memberships', 0)}",
            f"• Waiting to join: {access.get('pending_invites', 0)}",
            f"• Scheduled renewals: {access.get('scheduled_memberships', 0)}",
            f"• Expired: {access.get('expired_memberships', 0)}",
            "",
            "Active and scheduled members:",
        ]
    )
    current_access = stats.get("current_access", [])
    if not current_access:
        lines.append("• No channel access records yet.")
    else:
        for membership in current_access:
            person = (
                f"@{membership['username']}"
                if membership["username"]
                else membership["display_name"]
            )
            expires = (
                "Lifetime"
                if membership["expires_at_utc"] is None
                else format_stats_timestamp(membership["expires_at_utc"])
            )
            starts = format_stats_timestamp(membership["starts_at_utc"])
            lines.append(
                f"• {person} — {membership['plan_label']} — "
                f"starts {starts}, expires {expires}"
            )
    return "\n".join(lines)


def format_stats_timestamp(timestamp_utc: str) -> str:
    """Convert a stored UTC timestamp to the owner's UTC+3 display time."""
    parsed = datetime.strptime(timestamp_utc, "%Y-%m-%d %H:%M:%S UTC")
    local_time = parsed.replace(tzinfo=timezone.utc).astimezone(DISPLAY_TIMEZONE)
    return local_time.strftime("%Y-%m-%d %H:%M:%S UTC+3")


async def stats_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    user = update.effective_user
    message = update.effective_message
    chat = update.effective_chat
    if user is None or message is None:
        return
    if chat is None or chat.type != "private":
        await message.reply_text("For privacy, use /stats in a private chat.")
        return

    admin_id = _configured_admin_id(context)
    if admin_id is None:
        await message.reply_text(
            "Admin stats are not configured yet. Use /myid in a private chat "
            "to get your Telegram user ID."
        )
        return
    if user.id != admin_id:
        await message.reply_text("You don't have access to admin stats.")
        return

    try:
        stats = read_stats(_database_path(context))
    except (OSError, sqlite3.Error) as error:
        logger.error("Could not load usage statistics (%s).", type(error).__name__)
        await message.reply_text("Stats are temporarily unavailable.")
        return
    await message.reply_text(format_stats_report(stats))


def _configured_channel_id(context: ContextTypes.DEFAULT_TYPE) -> int | None:
    raw_id = context.bot_data.get("vip_channel_id")
    if raw_id is None:
        raw_id = get_setting(_database_path(context), "vip_channel_id")
    if raw_id is None:
        raw_id = os.environ.get("VIP_CHANNEL_ID")
    if raw_id is not None:
        try:
            return int(raw_id)
        except (TypeError, ValueError):
            return None
    return None


async def check_expired_memberships_job(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Scheduled task: checks for expired memberships, kicks them, and notifies them."""
    db_path = _database_path(context)
    now_utc = datetime.now(timezone.utc)
    try:
        expired = expired_memberships(db_path, now_utc)
    except Exception as err:
        logger.error("Failed to query expired memberships: %s", err)
        return

    if not expired:
        return

    channel_id = _configured_channel_id(context)
    for mem in expired:
        user_id = mem["telegram_user_id"]
        # Double check: Never expire lifetime memberships
        if mem.get("expires_at_utc") is None or mem.get("plan_id") == "lifetime":
            continue

        # 1. Remove from VIP channel (ban + unban kicks without permanent blacklist)
        if channel_id:
            try:
                await context.bot.ban_chat_member(chat_id=channel_id, user_id=user_id)
                await context.bot.unban_chat_member(chat_id=channel_id, user_id=user_id)
                logger.info(
                    "Automatically removed expired member %s from VIP channel %s",
                    user_id,
                    channel_id,
                )
            except TelegramError as err:
                logger.warning(
                    "Could not remove expired user %s from channel: %s", user_id, err
                )

        # 2. Mark membership expired in database
        try:
            mark_membership_expired(db_path, user_id)
        except Exception as err:
            logger.error("Could not mark membership expired in DB for %s: %s", user_id, err)

        # 3. Notify customer directly in Telegram
        try:
            display_name = mem.get("display_name", "Trader")
            plan_label = mem.get("plan_label", "VIP")
            exp_time_str = format_stats_timestamp(mem["expires_at_utc"])
            message = (
                f"⌛ YOUR ZOUMFX VIP ACCESS HAS EXPIRED\n\n"
                f"Hello {display_name},\n"
                f"Your subscription for {plan_label} expired on {exp_time_str}.\n\n"
                f"You have been automatically removed from the VIP channel.\n\n"
                f"To renew your access and continue receiving high-precision XAUUSD Gold signals, tap 💎 VIP PLANS below!"
            )
            await context.bot.send_message(
                chat_id=user_id,
                text=message,
                reply_markup=start_keyboard(),
            )
        except TelegramError as err:
            logger.warning(
                "Could not send expiry notification to user %s: %s", user_id, err
            )


async def _deliver_pending_approved_invites(
    context: ContextTypes.DEFAULT_TYPE, channel_id: int
) -> int:
    """Scan and deliver single-use invite links to any approved members waiting for their link."""
    db_path = _database_path(context)
    delivered_count = 0
    try:
        with closing(sqlite3.connect(db_path, timeout=15)) as connection:
            connection.row_factory = sqlite3.Row
            rows = connection.execute(
                """
                SELECT m.* FROM memberships m
                WHERE m.status = 'active'
                  AND NOT EXISTS (
                      SELECT 1 FROM channel_invites ci
                      WHERE ci.telegram_user_id = m.telegram_user_id
                        AND ci.status IN ('pending', 'activated')
                        AND ci.channel_id = ?
                  )
                """,
                (channel_id,),
            ).fetchall()
    except Exception as err:
        logger.error("Could not query pending invite deliveries: %s", err)
        return 0

    now_utc = datetime.now(timezone.utc)
    for mem in rows:
        user_id = mem["telegram_user_id"]
        plan_label = mem["plan_label"]
        plan_id = mem["plan_id"]
        link_expire_dt = now_utc + timedelta(hours=48)
        try:
            link_obj = await context.bot.create_chat_invite_link(
                chat_id=channel_id,
                member_limit=1,
                expire_date=int(link_expire_dt.timestamp()),
                name=f"VIP-{user_id}-auto",
            )
            create_pending_invite(
                db_path=db_path,
                telegram_user_id=user_id,
                channel_id=channel_id,
                plan_kind=mem["plan_kind"],
                plan_id=plan_id,
                invite_link=link_obj.invite_link,
            )
            starts_formatted = format_stats_timestamp(mem["starts_at_utc"])
            exp_formatted = (
                "✨ Permanent Lifetime Access"
                if mem["expires_at_utc"] is None
                else format_stats_timestamp(mem["expires_at_utc"])
            )
            msg = (
                "✅ VIP CHANNEL INVITATION LINK 💎\n\n"
                f"Your private invitation link for {plan_label} is ready!\n\n"
                f"🔗 YOUR UNIQUE ONE-TIME LINK:\n{link_obj.invite_link}\n\n"
                "🔒 SECURITY & ACCESS RULES:\n"
                "• This private invitation link is unique to YOU.\n"
                "• member_limit = 1 (Only 1 person can join; sharing will not work).\n"
                "• This link expires in 48 hours.\n\n"
                "⏳ MEMBERSHIP STATUS:\n"
                f"• Plan: {plan_label}\n"
                f"• Starts: {starts_formatted}\n"
                f"• Expiry: {exp_formatted}\n\n"
                "👇 Tap the link above to join the VIP Channel now!"
            )
            await context.bot.send_message(chat_id=user_id, text=msg)
            delivered_count += 1
            logger.info("Delivered single-use invite link to user %s", user_id)
        except Exception as err:
            logger.error("Failed to auto-deliver invite to user %s: %s", user_id, err)

    return delivered_count


async def set_channel_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    user = update.effective_user
    message = update.effective_message
    if user is None or message is None:
        return

    admin_id = _configured_admin_id(context)
    if admin_id is None or user.id != admin_id:
        await message.reply_text("You don't have access to admin commands.")
        return

    args = context.args or []
    if not args:
        curr = _configured_channel_id(context)
        curr_str = f"Current VIP Channel ID: `{curr}`" if curr else "No VIP channel configured yet."
        await message.reply_text(
            f"{curr_str}\n\n"
            "To set your VIP Channel, send:\n"
            "`/setchannel <channel_id or @channel_username>`\n"
            "Example: `/setchannel -1001234567890` or `/setchannel @ZoumfxVIP`\n\n"
            "Or simply post any message in your channel, or forward a post from it to this bot!",
            parse_mode="Markdown",
        )
        return

    target = args[0].strip()
    try:
        if target.startswith("-100") or (target.startswith("-") and target[1:].isdigit()) or target.isdigit():
            channel_id = int(target)
            chat = await context.bot.get_chat(channel_id)
        else:
            chat = await context.bot.get_chat(target)
            channel_id = chat.id

        chat_member = await context.bot.get_chat_member(channel_id, context.bot.id)
        if chat_member.status not in ("administrator", "creator"):
            await message.reply_text(
                f"⚠️ Found chat '{chat.title}', but the bot is NOT an administrator in this channel.\n"
                "Please make the bot an admin with 'Invite Users via Link' and 'Manage Chat' permissions first."
            )
            return

        db_path = _database_path(context)
        set_setting(db_path, "vip_channel_id", str(channel_id))
        context.bot_data["vip_channel_id"] = channel_id

        delivered = await _deliver_pending_approved_invites(context, channel_id)
        delivery_note = (
            f"\n\n🚀 Immediately delivered {delivered} pending invite link(s) to approved customers!"
            if delivered
            else ""
        )

        await message.reply_text(
            f"✅ VIP Channel successfully configured!\n\n"
            f"• Title: {chat.title}\n"
            f"• ID: `{channel_id}`\n"
            f"• Bot Status: {chat_member.status}{delivery_note}\n\n"
            "The bot will now automatically generate unique 1-person invite links on payment approvals and manage expirations!"
        )
    except TelegramError as err:
        await message.reply_text(f"❌ Telegram Error checking channel '{target}': {err}")


async def channel_info_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    user = update.effective_user
    message = update.effective_message
    if user is None or message is None:
        return

    admin_id = _configured_admin_id(context)
    if admin_id is None or user.id != admin_id:
        await message.reply_text("You don't have access to admin commands.")
        return

    channel_id = _configured_channel_id(context)
    if not channel_id:
        await message.reply_text(
            "No VIP Channel is configured yet.\n\n"
            "Use `/setchannel <channel_id or @username>` or forward a post from your channel to set it.",
            parse_mode="Markdown",
        )
        return

    try:
        chat = await context.bot.get_chat(channel_id)
        chat_member = await context.bot.get_chat_member(channel_id, context.bot.id)
        await message.reply_text(
            f"📢 CONFIGURED VIP CHANNEL:\n\n"
            f"• Title: {chat.title}\n"
            f"• Channel ID: `{channel_id}`\n"
            f"• Bot Admin Status: {chat_member.status}\n"
            f"• Can Invite Users: {getattr(chat_member, 'can_invite_users', True)}\n"
            f"• Can Restrict/Kick: {getattr(chat_member, 'can_restrict_members', True)}\n\n"
            "Automatic member addition and expiry management is ACTIVE."
        )
    except TelegramError as err:
        await message.reply_text(f"Configured Channel ID: {channel_id}\nError querying chat: {err}")


async def check_expiry_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    user = update.effective_user
    message = update.effective_message
    if user is None or message is None:
        return

    admin_id = _configured_admin_id(context)
    if admin_id is None or user.id != admin_id:
        await message.reply_text("You don't have access to admin commands.")
        return

    await message.reply_text("Checking for expired VIP memberships...")
    await check_expired_memberships_job(context)
    await message.reply_text("✅ Expiry check completed.")


async def new_link_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    """Admin command: /newlink <user_id> - generates a fresh 1-person link for an approved member."""
    user = update.effective_user
    message = update.effective_message
    if user is None or message is None:
        return

    admin_id = _configured_admin_id(context)
    if admin_id is None or user.id != admin_id:
        await message.reply_text("You don't have access to admin commands.")
        return

    args = context.args or []
    if not args:
        await message.reply_text(
            "Usage: `/newlink <user_id>`\n"
            "Generates a fresh single-use 1-person invitation link for an active VIP member.",
            parse_mode="Markdown",
        )
        return

    try:
        target_user_id = int(args[0])
    except ValueError:
        await message.reply_text("User ID must be numeric.")
        return

    channel_id = _configured_channel_id(context)
    if not channel_id:
        await message.reply_text(
            "VIP Channel is not configured yet. Run /setchannel first."
        )
        return

    db_path = _database_path(context)
    member = get_membership(db_path, target_user_id)
    if not member or member["status"] != "active":
        await message.reply_text(
            f"User ID {target_user_id} does not have an active VIP membership in the database."
        )
        return

    now_utc = datetime.now(timezone.utc)
    link_expire_dt = now_utc + timedelta(hours=48)
    try:
        link_obj = await context.bot.create_chat_invite_link(
            chat_id=channel_id,
            member_limit=1,
            expire_date=int(link_expire_dt.timestamp()),
            name=f"VIP-{target_user_id}-reissue",
        )
        create_pending_invite(
            db_path=db_path,
            telegram_user_id=target_user_id,
            channel_id=channel_id,
            plan_kind=member["plan_kind"],
            plan_id=member["plan_id"],
            invite_link=link_obj.invite_link,
        )

        starts_formatted = format_stats_timestamp(member["starts_at_utc"])
        exp_formatted = (
            "✨ Permanent Lifetime Access"
            if member["expires_at_utc"] is None
            else format_stats_timestamp(member["expires_at_utc"])
        )
        cust_msg = (
            "🔄 REPLACEMENT VIP INVITATION LINK 💎\n\n"
            f"Your replacement link for {member['plan_label']} has been generated.\n\n"
            f"🔗 YOUR UNIQUE ONE-TIME LINK:\n{link_obj.invite_link}\n\n"
            "🔒 SECURITY & ACCESS RULES:\n"
            "• This private invitation link is unique to YOU.\n"
            "• member_limit = 1 (Only 1 person can join; sharing will not work).\n"
            "• This link expires in 48 hours.\n\n"
            "⏳ MEMBERSHIP STATUS:\n"
            f"• Plan: {member['plan_label']}\n"
            f"• Starts: {starts_formatted}\n"
            f"• Expiry: {exp_formatted}\n\n"
            "👇 Tap the link above to join the VIP Channel now!"
        )
        await context.bot.send_message(chat_id=target_user_id, text=cust_msg)
        await message.reply_text(
            f"✅ Replacement 1-person link generated and delivered to user {target_user_id}!\n"
            f"Link: {link_obj.invite_link}"
        )
    except TelegramError as err:
        await message.reply_text(
            f"❌ Failed to generate invite link: {err}\n"
            "Check bot admin permissions in the VIP channel."
        )


async def customer_link_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    """Customer command: /link - retrieves or refreshes their active 1-person link."""
    user = update.effective_user
    message = update.effective_message
    if user is None or message is None:
        return

    db_path = _database_path(context)
    member = get_membership(db_path, user.id)
    if not member or member["status"] != "active":
        await message.reply_text(
            "You do not have an active VIP membership.\n"
            "Send /start and tap 💎 VIP PLANS to join!"
        )
        return

    channel_id = _configured_channel_id(context)
    if not channel_id:
        await message.reply_text(
            "Your VIP membership is active! The VIP channel is being linked. "
            "Your invite link will be delivered here automatically."
        )
        return

    now_utc = datetime.now(timezone.utc)
    link_expire_dt = now_utc + timedelta(hours=48)
    try:
        link_obj = await context.bot.create_chat_invite_link(
            chat_id=channel_id,
            member_limit=1,
            expire_date=int(link_expire_dt.timestamp()),
            name=f"VIP-{user.id}-req",
        )
        create_pending_invite(
            db_path=db_path,
            telegram_user_id=user.id,
            channel_id=channel_id,
            plan_kind=member["plan_kind"],
            plan_id=member["plan_id"],
            invite_link=link_obj.invite_link,
        )
        starts_formatted = format_stats_timestamp(member["starts_at_utc"])
        exp_formatted = (
            "✨ Permanent Lifetime Access"
            if member["expires_at_utc"] is None
            else format_stats_timestamp(member["expires_at_utc"])
        )
        msg = (
            "🔗 YOUR ACTIVE VIP INVITATION LINK 💎\n\n"
            f"Plan: {member['plan_label']}\n"
            f"Expiry: {exp_formatted}\n\n"
            f"👉 Your Unique Link: {link_obj.invite_link}\n\n"
            "⚠️ This link is strictly for you (member_limit = 1) and expires in 48 hours.\n"
            "Tap above to join now!"
        )
        await message.reply_text(msg)
    except TelegramError as err:
        logger.error("Could not generate link for customer %s: %s", user.id, err)
        await message.reply_text(
            "Your VIP membership is active! An admin is preparing your VIP link."
        )


async def channel_post_listener(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    """Auto-detects channel ID whenever a message is posted in the channel where the bot is admin."""
    post = update.channel_post
    if not post or not post.chat:
        return
    channel_id = post.chat.id
    channel_title = post.chat.title or "VIP Channel"
    db_path = _database_path(context)

    current = get_setting(db_path, "vip_channel_id")
    if current != str(channel_id):
        set_setting(db_path, "vip_channel_id", str(channel_id))
        context.bot_data["vip_channel_id"] = channel_id
        logger.info(
            "Auto-registered VIP Channel %s ('%s') from channel post.",
            channel_id,
            channel_title,
        )

        admin_id = _configured_admin_id(context)
        if admin_id:
            try:
                await context.bot.send_message(
                    chat_id=admin_id,
                    text=(
                        f"✅ VIP CHANNEL AUTO-DETECTED FROM POST!\n\n"
                        f"• Title: {channel_title}\n"
                        f"• Channel ID: `{channel_id}`\n\n"
                        "Automatic 1-person link generation and expiry tracking are now ACTIVE!"
                    ),
                    parse_mode="Markdown",
                )
            except Exception:
                pass

        delivered = await _deliver_pending_approved_invites(context, channel_id)
        if delivered and admin_id:
            try:
                await context.bot.send_message(
                    chat_id=admin_id,
                    text=f"🚀 Automatically delivered {delivered} pending VIP invite link(s) to approved customers!",
                )
            except Exception:
                pass


async def chat_member_joined_handler(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    """Automatically verifies when an approved customer joins the VIP channel."""
    chat_member = update.chat_member
    if not chat_member or not chat_member.chat:
        return
    channel_id = _configured_channel_id(context)
    if not channel_id or chat_member.chat.id != channel_id:
        return

    new_member = chat_member.new_chat_member
    old_member = chat_member.old_chat_member

    if old_member.status in ("left", "kicked") and new_member.status in (
        "member",
        "administrator",
        "restricted",
    ):
        user = new_member.user
        if not user or user.is_bot:
            return

        db_path = _database_path(context)
        now_str = utc_timestamp(datetime.now(timezone.utc))
        try:
            with closing(sqlite3.connect(db_path, timeout=15)) as conn:
                with conn:
                    conn.execute(
                        """
                        UPDATE channel_invites
                        SET status = 'activated', activated_at_utc = ?
                        WHERE telegram_user_id = ? AND status = 'pending' AND channel_id = ?
                        """,
                        (now_str, user.id, channel_id),
                    )
        except Exception as err:
            logger.error("Could not activate invite for %s: %s", user.id, err)

        logger.info("Verified customer %s joined VIP channel %s", user.id, channel_id)

        try:
            await context.bot.send_message(
                chat_id=user.id,
                text=(
                    "🎉 WELCOME TO THE ZOUMFX VIP CHANNEL! 🚀\n\n"
                    "You have successfully joined the private VIP trading channel.\n\n"
                    "💎 What to expect:\n"
                    "• High-precision XAUUSD (Gold) trade setups with Entry, SL & TP\n"
                    "• Market structure analysis & London/NY session updates\n"
                    "• Strict risk management guidance\n\n"
                    "Turn on channel notifications so you never miss a trade setup!"
                ),
            )
        except Exception:
            pass

        admin_id = _configured_admin_id(context)
        if admin_id:
            try:
                username_str = f"@{user.username}" if user.username else "no username"
                await context.bot.send_message(
                    chat_id=admin_id,
                    text=(
                        f"✅ VIP JOIN VERIFIED!\n\n"
                        f"Customer: {user.full_name}\n"
                        f"Username: {username_str}\n"
                        f"User ID: `{user.id}`\n\n"
                        "Successfully joined the VIP Channel using their single-use link."
                    ),
                    parse_mode="Markdown",
                )
            except Exception:
                pass


async def my_chat_member_handler(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    chat_member = update.my_chat_member
    if not chat_member:
        return
    chat = chat_member.chat
    if chat.type not in ("channel", "supergroup"):
        return

    new_status = chat_member.new_chat_member.status
    if new_status in ("administrator", "creator"):
        channel_id = chat.id
        db_path = _database_path(context)
        set_setting(db_path, "vip_channel_id", str(channel_id))
        context.bot_data["vip_channel_id"] = channel_id
        logger.info(
            "Auto-registered VIP Channel %s ('%s') from bot administrator update.",
            channel_id,
            chat.title,
        )

        admin_id = _configured_admin_id(context)
        if admin_id:
            try:
                await context.bot.send_message(
                    chat_id=admin_id,
                    text=(
                        f"✅ VIP CHANNEL AUTO-DETECTED!\n\n"
                        f"The bot was granted administrator rights in:\n"
                        f"• Title: {chat.title}\n"
                        f"• ID: `{channel_id}`\n\n"
                        "Automatic single-use invitation links (member_limit=1) and "
                        "subscription expiry tracking are now fully active for this channel!"
                    ),
                    parse_mode="Markdown",
                )
            except TelegramError:
                pass

        await _deliver_pending_approved_invites(context, channel_id)


async def error_handler(
    update: object, context: ContextTypes.DEFAULT_TYPE
) -> None:
    del update
    error = context.error
    if error is None:
        logger.error("Unhandled Telegram bot error.")
        return
    if isinstance(error, NetworkError):
        logger.warning(
            "Temporary Telegram network error while handling an update (%s).",
            type(error).__name__,
        )
        return
    if isinstance(error, RetryAfter):
        logger.warning(
            "Telegram rate-limited a bot action; retry after %s seconds.",
            error.retry_after,
        )
        return
    logger.error(
        "Unhandled Telegram bot error (%s).",
        type(error).__name__,
        exc_info=(type(error), error, error.__traceback__),
    )


def run_polling_with_retries(token: str) -> None:
    """Run polling, retrying startup/runtime failures without exposing the token."""
    restart_delay_seconds = 5
    max_restart_delay_seconds = 300

    while True:
        run_started_at = time.monotonic()
        try:
            application = build_application(token)
            logger.info("Starting the ZOUMFX VIP Telegram bot with long polling.")
            application.run_polling(
                allowed_updates=[
                    "message",
                    "callback_query",
                    "channel_post",
                    "my_chat_member",
                    "chat_member",
                ],
                bootstrap_retries=5,
            )
            return
        except KeyboardInterrupt:
            logger.info("Bot stopped by an operator.")
            return
        except InvalidToken:
            logger.critical(
                "Telegram rejected TELEGRAM_BOT_TOKEN. Check the Replit Secret."
            )
            raise SystemExit(1) from None
        except Exception as error:
            if time.monotonic() - run_started_at >= max_restart_delay_seconds:
                restart_delay_seconds = 5
            logger.error(
                "Bot polling stopped unexpectedly (%s); restarting in %s seconds.",
                type(error).__name__,
                restart_delay_seconds,
            )
            time.sleep(restart_delay_seconds)
            restart_delay_seconds = min(
                restart_delay_seconds * 2,
                max_restart_delay_seconds,
            )


def build_application(
    token: str,
    *,
    database_path: str | Path | None = None,
    admin_user_id: str | None = None,
) -> Application[Any]:
    validate_plan_configuration()
    application = Application.builder().token(token).build()
    application.bot_data["usage_db_path"] = str(
        database_path
        or os.environ.get("ZOUMFX_VIP_DB_PATH", DEFAULT_DATABASE_PATH)
    )
    application.bot_data["admin_user_id"] = (
        admin_user_id
        if admin_user_id is not None
        else os.environ.get("ADMIN_TELEGRAM_USER_ID")
    )
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("myid", my_id_command))
    application.add_handler(CommandHandler("stats", stats_command))
    application.add_handler(CommandHandler("setchannel", set_channel_command))
    application.add_handler(CommandHandler("channel", channel_info_command))
    application.add_handler(CommandHandler("checkexpiry", check_expiry_command))
    application.add_handler(CommandHandler("newlink", new_link_command))
    application.add_handler(CommandHandler("resendlink", new_link_command))
    application.add_handler(CommandHandler("link", customer_link_command))
    application.add_handler(CommandHandler("cancel", cancel_payment_command))
    application.add_handler(
        ChatMemberHandler(
            my_chat_member_handler, ChatMemberHandler.MY_CHAT_MEMBER
        )
    )
    application.add_handler(
        ChatMemberHandler(
            chat_member_joined_handler, ChatMemberHandler.CHAT_MEMBER
        )
    )
    application.add_handler(
        MessageHandler(filters.ChatType.CHANNEL, channel_post_listener)
    )
    application.add_handler(CallbackQueryHandler(button_handler))
    application.add_handler(
        MessageHandler(
            (filters.TEXT | filters.PHOTO | filters.Document.IMAGE)
            & ~filters.COMMAND,
            payment_message_handler,
        )
    )
    application.add_error_handler(error_handler)

    if application.job_queue:
        application.job_queue.run_repeating(
            check_expired_memberships_job,
            interval=60,
            first=10,
            name="check_expired_memberships",
        )
        logger.info("Automatic VIP membership expiry job registered (every 60s).")

    return application


def _load_env_file() -> None:
    env_path = Path(__file__).with_name(".env")
    if env_path.is_file():
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        key, _, val = line.partition("=")
                        key = key.strip()
                        val = val.strip().strip("'\"")
                        if key and key not in os.environ:
                            os.environ[key] = val
        except Exception:
            pass


def main() -> None:
    _load_env_file()
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        raise SystemExit(
            "Missing TELEGRAM_BOT_TOKEN. Add it in .env before starting the bot."
        )

    database_path = os.environ.get(
        "ZOUMFX_VIP_DB_PATH",
        str(DEFAULT_DATABASE_PATH),
    )
    initialize_database(database_path)
    run_polling_with_retries(token)


if __name__ == "__main__":
    main()
