"""Customer payment submissions and owner-only manual review."""

from __future__ import annotations

import logging
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.error import TelegramError
from telegram.ext import ContextTypes

from zoumfx_vip_config import SUBSCRIPTION_PLANS
from zoumfx_vip_access import (
    PLAN_DURATION_MONTHS,
    add_calendar_months,
    create_pending_invite,
    get_membership,
    parse_utc_timestamp,
    set_membership,
    utc_timestamp,
)
from zoumfx_vip_usage import (
    DEFAULT_DATABASE_PATH,
    create_payment_submission,
    get_payment_submission,
    get_setting,
    mark_payment_delivery_failed,
    set_setting,
    transition_payment_submission,
)

logger = logging.getLogger("zoumfx_vip_payments")

PAYMENT_DRAFT_KEY = "zoumfx_vip_payment_draft"
DISPLAY_TIMEZONE = timezone(timedelta(hours=3), "UTC+3")
SUBSCRIPTION_PLANS_BY_ID = {plan["id"]: plan for plan in SUBSCRIPTION_PLANS}


def format_stats_timestamp(timestamp_utc: str) -> str:
    parsed = datetime.strptime(timestamp_utc, "%Y-%m-%d %H:%M:%S UTC")
    local_time = parsed.replace(tzinfo=timezone.utc).astimezone(DISPLAY_TIMEZONE)
    return local_time.strftime("%Y-%m-%d %H:%M:%S UTC+3")


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


def payment_plan_keyboard(plan_id: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton(
                    "I HAVE PAID",
                    callback_data=f"payment:paid:{plan_id}",
                )
            ],
            [InlineKeyboardButton("Back", callback_data="nav:subscriptions")],
        ]
    )


def payment_cancel_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [[InlineKeyboardButton("Cancel", callback_data="payment:cancel")]]
    )


def payment_review_keyboard(submission_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton(
                    "APPROVE PAYMENT",
                    callback_data=f"pay:approve:{submission_id}",
                )
            ],
            [
                InlineKeyboardButton(
                    "REJECT PAYMENT",
                    callback_data=f"pay:reject:{submission_id}",
                )
            ],
        ]
    )


def _database_path(context: ContextTypes.DEFAULT_TYPE) -> Path:
    return Path(context.bot_data.get("usage_db_path", DEFAULT_DATABASE_PATH))


def _configured_admin_id(context: ContextTypes.DEFAULT_TYPE) -> int | None:
    raw_admin_id = context.bot_data.get("admin_user_id")
    if raw_admin_id is None:
        raw_admin_id = os.environ.get("ADMIN_TELEGRAM_USER_ID")
    try:
        admin_id = int(raw_admin_id)
    except (TypeError, ValueError):
        return None
    return admin_id if admin_id > 0 else None


def _is_private_chat(update: Update) -> bool:
    chat = update.effective_chat
    return chat is not None and chat.type == "private"


async def payment_callback_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    query = update.callback_query
    if query is None:
        return
    callback_data = query.data or ""

    if callback_data == "payment:cancel":
        context.user_data.pop(PAYMENT_DRAFT_KEY, None)
        await query.answer()
        await query.edit_message_text(
            "Payment submission cancelled.",
            reply_markup=InlineKeyboardMarkup(
                [[InlineKeyboardButton("Back", callback_data="nav:subscriptions")]]
            ),
        )
        return

    prefix, separator, plan_id = callback_data.partition("payment:paid:")
    if prefix or not separator or plan_id not in SUBSCRIPTION_PLANS_BY_ID:
        await query.answer("That payment option is not available.", show_alert=True)
        return
    if not _is_private_chat(update):
        await query.answer(
            "Please open the bot in a private chat to submit payment details.",
            show_alert=True,
        )
        return
    if _configured_admin_id(context) is None:
        await query.answer("Payment review is not configured.", show_alert=True)
        return

    plan = SUBSCRIPTION_PLANS_BY_ID[plan_id]
    context.user_data[PAYMENT_DRAFT_KEY] = {
        "plan_id": plan_id,
        "plan_label": f"{plan['name']} — {plan['price']}",
        "stage": "wallet",
    }
    await query.answer()
    await query.edit_message_text(
        "Please send the wallet address you sent the payment to.",
        reply_markup=payment_cancel_keyboard(),
    )


async def cancel_payment_command(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    context.user_data.pop(PAYMENT_DRAFT_KEY, None)
    message = update.effective_message
    if message:
        await message.reply_text("Payment submission cancelled.")


async def payment_message_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    draft = context.user_data.get(PAYMENT_DRAFT_KEY)
    message = update.effective_message
    user = update.effective_user
    if not draft or message is None or user is None:
        return
    if not _is_private_chat(update):
        return

    if draft["stage"] == "wallet":
        if not message.text:
            await message.reply_text(
                "Please send the wallet address as text.",
                reply_markup=payment_cancel_keyboard(),
            )
            return
        wallet_address = " ".join(message.text.split())
        if not wallet_address or len(wallet_address) > 256:
            await message.reply_text(
                "Please send a wallet address with no more than 256 characters.",
                reply_markup=payment_cancel_keyboard(),
            )
            return
        draft["wallet_address"] = wallet_address
        draft["stage"] = "screenshot"
        await message.reply_text(
            "Now send your payment screenshot as a photo or image file.",
            reply_markup=payment_cancel_keyboard(),
        )
        return

    if draft["stage"] != "screenshot":
        context.user_data.pop(PAYMENT_DRAFT_KEY, None)
        return

    screenshot_file_id: str | None = None
    screenshot_media_type: str | None = None
    if message.photo:
        screenshot_file_id = message.photo[-1].file_id
        screenshot_media_type = "photo"
    elif (
        message.document
        and (message.document.mime_type or "").lower().startswith("image/")
    ):
        screenshot_file_id = message.document.file_id
        screenshot_media_type = "document"
    if not screenshot_file_id or not screenshot_media_type:
        await message.reply_text(
            "Please send the screenshot as a photo or image file.",
            reply_markup=payment_cancel_keyboard(),
        )
        return

    admin_id = _configured_admin_id(context)
    if admin_id is None:
        context.user_data.pop(PAYMENT_DRAFT_KEY, None)
        await message.reply_text(
            "Payment review is not configured. Please contact @zoumfx."
        )
        return

    plan_id = draft["plan_id"]
    plan = SUBSCRIPTION_PLANS_BY_ID.get(plan_id)
    if plan is None:
        context.user_data.pop(PAYMENT_DRAFT_KEY, None)
        await message.reply_text("This payment plan is no longer available.")
        return

    try:
        submission_id = create_payment_submission(
            db_path=_database_path(context),
            telegram_user_id=user.id,
            username=user.username,
            display_name=user.full_name,
            plan_id=plan_id,
            plan_label=draft["plan_label"],
            wallet_address=draft["wallet_address"],
            screenshot_file_id=screenshot_file_id,
            screenshot_media_type=screenshot_media_type,
        )
    except (OSError, sqlite3.Error, ValueError) as error:
        logger.error("Could not save payment submission (%s).", type(error).__name__)
        await message.reply_text(
            "I couldn't save your payment submission. Please try again."
        )
        return

    username = f"@{user.username}" if user.username else "not set"
    display_name = " ".join(user.full_name.split())[:128] or "not set"
    submitted_at = datetime.now(timezone.utc).astimezone(DISPLAY_TIMEZONE)
    caption = (
        f"💳 VIP PAYMENT SUBMISSION #{submission_id}\n"
        f"Customer: {display_name}\n"
        f"Username: {username}\n"
        f"Telegram ID: {user.id}\n"
        f"Selected plan: {draft['plan_label']}\n"
        f"Wallet address provided: {draft['wallet_address']}\n"
        f"Submitted: {submitted_at.strftime('%Y-%m-%d %H:%M:%S UTC+3')}"
    )

    try:
        await context.bot.copy_message(
            chat_id=admin_id,
            from_chat_id=update.effective_chat.id,
            message_id=message.message_id,
            caption=caption,
            reply_markup=payment_review_keyboard(submission_id),
        )
    except TelegramError as error:
        try:
            mark_payment_delivery_failed(_database_path(context), submission_id)
        except (OSError, sqlite3.Error) as database_error:
            logger.error(
                "Could not record failed payment delivery (%s).",
                type(database_error).__name__,
            )
        logger.warning(
            "Could not deliver payment submission to admin (%s).",
            type(error).__name__,
        )
        await message.reply_text(
            "I couldn't deliver your submission to the admin. "
            "Please try again later or contact @zoumfx."
        )
        return

    context.user_data.pop(PAYMENT_DRAFT_KEY, None)
    await message.reply_text(
        "Your payment details and screenshot were sent to the admin for review. "
        "I will notify you after a decision."
    )


async def payment_review_callback(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    query = update.callback_query
    if query is None:
        return
    admin_id = _configured_admin_id(context)
    user = update.effective_user
    if (
        admin_id is None
        or user is None
        or user.id != admin_id
        or not _is_private_chat(update)
    ):
        await query.answer("Only the configured admin can review payments.", show_alert=True)
        return

    parts = (query.data or "").split(":")
    if len(parts) != 3 or parts[0] != "pay" or parts[1] not in {"approve", "reject"}:
        await query.answer("Invalid payment action.", show_alert=True)
        return
    try:
        submission_id = int(parts[2])
    except ValueError:
        await query.answer("Invalid payment submission.", show_alert=True)
        return

    try:
        submission = get_payment_submission(_database_path(context), submission_id)
    except (OSError, sqlite3.Error) as error:
        logger.error("Could not load payment submission (%s).", type(error).__name__)
        await query.answer("Payment review is temporarily unavailable.", show_alert=True)
        return
    if submission is None or submission["status"] != "pending":
        await query.answer("This payment has already been reviewed.", show_alert=True)
        return

    new_status = "approved" if parts[1] == "approve" else "rejected"
    try:
        changed = transition_payment_submission(
            db_path=_database_path(context),
            submission_id=submission_id,
            status=new_status,
            reviewer_telegram_user_id=user.id,
        )
    except (OSError, sqlite3.Error, ValueError) as error:
        logger.error("Could not update payment review (%s).", type(error).__name__)
        await query.answer("Payment review could not be saved.", show_alert=True)
        return
    if not changed:
        await query.answer("This payment has already been reviewed.", show_alert=True)
        return

    if new_status == "approved":
        plan_id = submission["plan_id"]
        plan_label = submission["plan_label"]
        user_id = submission["telegram_user_id"]
        username = submission.get("username")
        display_name = submission.get("display_name", "Trader")
        db_path = _database_path(context)

        now_utc = datetime.now(timezone.utc)
        duration_months = PLAN_DURATION_MONTHS.get(plan_id)

        # Check existing active membership to extend it seamlessly
        existing = get_membership(db_path, user_id)
        if existing and existing.get("status") == "active" and existing.get("expires_at_utc"):
            try:
                current_exp = parse_utc_timestamp(existing["expires_at_utc"])
                base_time = current_exp if current_exp > now_utc else now_utc
            except Exception:
                base_time = now_utc
        else:
            base_time = now_utc

        if duration_months is not None:
            new_expiry_dt = add_calendar_months(base_time, duration_months)
            new_expiry_utc = utc_timestamp(new_expiry_dt)
            duration_text = f"{duration_months} Month{'s' if duration_months > 1 else ''}"
        else:
            new_expiry_utc = None
            duration_text = "Permanent Lifetime Access"

        starts_at_utc = utc_timestamp(now_utc)

        # Save to memberships table
        set_membership(
            db_path=db_path,
            telegram_user_id=user_id,
            username=username,
            display_name=display_name,
            plan_id=plan_id,
            plan_label=plan_label,
            plan_kind="subscription",
            starts_at_utc=starts_at_utc,
            expires_at_utc=new_expiry_utc,
            status="active",
        )

        # Attempt to generate unique 1-person invite link
        channel_id = _configured_channel_id(context)
        invite_link = None
        link_error_msg = None

        if channel_id:
            try:
                link_expire_dt = now_utc + timedelta(hours=48)
                link_obj = await context.bot.create_chat_invite_link(
                    chat_id=channel_id,
                    member_limit=1,
                    expire_date=int(link_expire_dt.timestamp()),
                    name=f"VIP-{user_id}-{submission_id}",
                )
                invite_link = link_obj.invite_link
                create_pending_invite(
                    db_path=db_path,
                    telegram_user_id=user_id,
                    channel_id=channel_id,
                    plan_kind="subscription",
                    plan_id=plan_id,
                    invite_link=invite_link,
                )
            except TelegramError as link_err:
                link_error_msg = str(link_err)
                logger.error(
                    "Could not create unique invite link for channel %s: %s",
                    channel_id,
                    link_err,
                )

        starts_formatted = format_stats_timestamp(starts_at_utc)
        expiry_formatted = (
            "✨ Permanent Lifetime Access (Never Expires)"
            if new_expiry_utc is None
            else format_stats_timestamp(new_expiry_utc)
        )

        if invite_link:
            customer_message = (
                "✅ PAYMENT APPROVED — WELCOME TO ZOUMFX VIP! 💎\n\n"
                f"Your payment for {plan_label} has been verified and approved.\n\n"
                f"🔗 YOUR UNIQUE ONE-TIME INVITATION LINK:\n{invite_link}\n\n"
                "🔒 SECURITY & ACCESS RULES:\n"
                "• This private invitation link is unique to YOU.\n"
                "• member_limit = 1 (Only 1 person can join; sharing will not work).\n"
                "• This link expires in 48 hours.\n\n"
                "⏳ MEMBERSHIP STATUS:\n"
                f"• Plan: {plan_label}\n"
                f"• Duration: {duration_text}\n"
                f"• Starts: {starts_formatted}\n"
                f"• Expiry: {expiry_formatted}\n\n"
                "👇 Tap the link above to join the VIP Channel now!"
            )
            admin_note = (
                f"✅ APPROVED — Unique Link Generated (member_limit=1)\nExpires: {expiry_formatted}"
            )
        elif channel_id and link_error_msg:
            customer_message = (
                "✅ PAYMENT APPROVED — WELCOME TO ZOUMFX VIP! 💎\n\n"
                f"Your payment for {plan_label} has been verified and approved.\n\n"
                "⏳ MEMBERSHIP STATUS:\n"
                f"• Plan: {plan_label}\n"
                f"• Duration: {duration_text}\n"
                f"• Starts: {starts_formatted}\n"
                f"• Expiry: {expiry_formatted}\n\n"
                "Generating your private VIP Channel invitation link...\n"
                "Your unique 1-person link will appear here in just a moment!"
            )
            admin_note = (
                f"✅ APPROVED ({duration_text})\n⚠️ Telegram invite error: {link_error_msg}\n"
                "Check bot admin permissions in the channel, then send /newlink "
                f"{user_id} to deliver their link."
            )
        else:
            customer_message = (
                "✅ PAYMENT APPROVED — WELCOME TO ZOUMFX VIP! 💎\n\n"
                f"Your payment for {plan_label} has been verified and approved.\n\n"
                "⏳ MEMBERSHIP STATUS:\n"
                f"• Plan: {plan_label}\n"
                f"• Duration: {duration_text}\n"
                f"• Starts: {starts_formatted}\n"
                f"• Expiry: {expiry_formatted}\n\n"
                "Generating your private VIP Channel invitation link...\n"
                "Your unique 1-person link will appear here in just a moment!"
            )
            admin_note = (
                f"✅ APPROVED ({duration_text})\n"
                "⚠️ VIP Channel is not set yet! Send /setchannel <channel_id or @username> "
                "or forward a post from the channel.\n"
                f"The bot will automatically generate and deliver the 1-person link to {display_name} immediately!"
            )
    else:
        customer_message = (
            "❌ PAYMENT REJECTED\n\n"
            "Your payment was rejected. Please contact @zoumfx if you need help."
        )
        admin_note = "❌ PAYMENT REJECTED"

    customer_notified = True
    try:
        await context.bot.send_message(
            chat_id=submission["telegram_user_id"],
            text=customer_message,
        )
    except TelegramError as error:
        customer_notified = False
        logger.warning(
            "Could not notify customer about payment decision (%s).",
            type(error).__name__,
        )

    if query.message and query.message.caption:
        try:
            await query.edit_message_caption(
                caption=f"{query.message.caption}\n\n{admin_note}",
                reply_markup=None,
            )
        except TelegramError as error:
            logger.warning(
                "Could not update reviewed payment message (%s).",
                type(error).__name__,
            )

    if customer_notified:
        await query.answer("Customer notified.")
    else:
        await query.answer(
            "Decision saved, but Telegram could not notify the customer.",
            show_alert=True,
        )
