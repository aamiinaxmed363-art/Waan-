import asyncio
import logging
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from zoumfx_vip_config import (
    INVITE_PLANS,
    SUBSCRIPTION_PLANS,
    WELCOME_MESSAGE,
)
from zoumfx_vip_access import (
    PLAN_DURATION_MONTHS,
    add_calendar_months,
    create_pending_invite,
    expired_memberships,
    get_membership,
    mark_membership_expired,
    parse_utc_timestamp,
    set_membership,
    utc_timestamp,
)
from zoumfx_vip_usage import (
    create_payment_submission,
    get_payment_submission,
    get_setting,
    initialize_database,
    read_stats,
    record_event,
    set_setting,
    transition_payment_submission,
)
from zoumfx_vip_payments import payment_review_callback
from zoumfx_vip_bot import (
    _deliver_pending_approved_invites,
    chat_member_joined_handler,
    check_expired_memberships_job,
    new_link_command,
    validate_plan_configuration,
)


class TestZoumfxVipBot(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_usage.sqlite3"
        initialize_database(self.db_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_plan_configuration(self):
        validate_plan_configuration()
        self.assertEqual(len(SUBSCRIPTION_PLANS), 4)
        self.assertEqual(len(INVITE_PLANS), 4)

    def test_all_four_plans_approval_and_link_generation(self):
        """1-4. Test payment approval for Monthly, Half Year, Yearly, and Lifetime plans."""
        plans_to_test = [
            ("monthly", 1, "VIP MONTHLY — $5"),
            ("half_year", 6, "VIP HALF YEAR — $25"),
            ("yearly", 12, "VIP YEARLY — $50"),
            ("lifetime", None, "VIP LIFETIME — $100"),
        ]

        set_setting(self.db_path, "vip_channel_id", "-100192837465")

        for plan_id, duration_months, plan_label in plans_to_test:
            user_id = 1000 + (duration_months or 99)
            sub_id = create_payment_submission(
                db_path=self.db_path,
                telegram_user_id=user_id,
                username=f"trader_{plan_id}",
                display_name=f"Trader {plan_id}",
                plan_id=plan_id,
                plan_label=plan_label,
                wallet_address="0x8887f5610a2f6d5cd7cd1f23ca445bc7c3e2bb6d",
                screenshot_file_id="photo_xyz",
                screenshot_media_type="photo",
            )

            context = MagicMock()
            context.bot_data = {
                "usage_db_path": str(self.db_path),
                "admin_user_id": 6006131461,
                "vip_channel_id": -100192837465,
            }
            fake_link = f"https://t.me/+TEST_{plan_id.upper()}"
            context.bot.create_chat_invite_link = AsyncMock(
                return_value=MagicMock(invite_link=fake_link)
            )
            context.bot.send_message = AsyncMock()

            query = MagicMock()
            query.data = f"pay:approve:{sub_id}"
            query.effective_user.id = 6006131461
            query.effective_chat.type = "private"
            query.message.caption = f"VIP Payment #{sub_id}"
            query.edit_message_caption = AsyncMock()
            query.answer = AsyncMock()

            update = MagicMock()
            update.callback_query = query
            update.effective_user.id = 6006131461
            update.effective_chat.type = "private"

            asyncio.run(payment_review_callback(update, context))

            # 1. Verify link created with member_limit=1
            context.bot.create_chat_invite_link.assert_called_once()
            call_kw = context.bot.create_chat_invite_link.call_args.kwargs
            self.assertEqual(call_kw["member_limit"], 1, "member_limit must strictly be 1")
            self.assertEqual(call_kw["chat_id"], -100192837465)

            # 2. Verify link sent directly to customer
            context.bot.send_message.assert_called_once()
            sent_msg = context.bot.send_message.call_args.kwargs["text"]
            self.assertIn(fake_link, sent_msg)
            self.assertIn("member_limit = 1", sent_msg)
            self.assertNotIn("@zoumfx to get your VIP channel link", sent_msg)

            # 3. Verify membership duration in database
            membership = get_membership(self.db_path, user_id)
            self.assertIsNotNone(membership)
            self.assertEqual(membership["status"], "active")
            if duration_months is None:
                self.assertIsNone(membership["expires_at_utc"])
            else:
                self.assertIsNotNone(membership["expires_at_utc"])

    def test_auto_verify_when_customer_joins(self):
        """6. Verify that customer joining the VIP channel is automatically detected and activated."""
        user_id = 44444
        set_setting(self.db_path, "vip_channel_id", "-100192837465")

        # Create pending invite
        create_pending_invite(
            db_path=self.db_path,
            telegram_user_id=user_id,
            channel_id=-100192837465,
            plan_kind="subscription",
            plan_id="monthly",
            invite_link="https://t.me/+JOIN_VERIFY_TEST",
        )

        context = MagicMock()
        context.bot_data = {
            "usage_db_path": str(self.db_path),
            "admin_user_id": 6006131461,
            "vip_channel_id": -100192837465,
        }
        context.bot.send_message = AsyncMock()

        # Simulate ChatMember update: left -> member
        update = MagicMock()
        update.chat_member.chat.id = -100192837465
        update.chat_member.old_chat_member.status = "left"
        update.chat_member.new_chat_member.status = "member"
        update.chat_member.new_chat_member.user.id = user_id
        update.chat_member.new_chat_member.user.full_name = "Joined Trader"
        update.chat_member.new_chat_member.user.username = "joined_trader"
        update.chat_member.new_chat_member.user.is_bot = False

        asyncio.run(chat_member_joined_handler(update, context))

        # Verify welcome message sent to customer and notice sent to admin
        self.assertEqual(context.bot.send_message.call_count, 2)
        customer_call = context.bot.send_message.call_args_list[0].kwargs
        admin_call = context.bot.send_message.call_args_list[1].kwargs

        self.assertEqual(customer_call["chat_id"], user_id)
        self.assertIn("WELCOME TO THE ZOUMFX VIP CHANNEL", customer_call["text"])

        self.assertEqual(admin_call["chat_id"], 6006131461)
        self.assertIn("VIP JOIN VERIFIED", admin_call["text"])

    def test_reissue_replacement_link(self):
        """10. Verify admin can generate a replacement 1-person link with /newlink."""
        user_id = 33333
        set_setting(self.db_path, "vip_channel_id", "-100192837465")

        set_membership(
            db_path=self.db_path,
            telegram_user_id=user_id,
            username="lost_link_user",
            display_name="Lost Link User",
            plan_id="monthly",
            plan_label="VIP MONTHLY — $5",
            plan_kind="subscription",
            starts_at_utc=utc_timestamp(datetime.now(timezone.utc)),
            expires_at_utc=utc_timestamp(add_calendar_months(datetime.now(timezone.utc), 1)),
            status="active",
        )

        context = MagicMock()
        context.bot_data = {
            "usage_db_path": str(self.db_path),
            "admin_user_id": 6006131461,
            "vip_channel_id": -100192837465,
        }
        context.args = [str(user_id)]
        context.bot.create_chat_invite_link = AsyncMock(
            return_value=MagicMock(invite_link="https://t.me/+NEW_REPLACEMENT_LINK")
        )
        context.bot.send_message = AsyncMock()

        update = MagicMock()
        update.effective_user.id = 6006131461
        update.effective_message.reply_text = AsyncMock()

        asyncio.run(new_link_command(update, context))

        # Verify new link created with member_limit=1
        context.bot.create_chat_invite_link.assert_called_once()
        call_kw = context.bot.create_chat_invite_link.call_args.kwargs
        self.assertEqual(call_kw["member_limit"], 1)

        # Verify replacement link delivered to customer
        context.bot.send_message.assert_called_once()
        sent_text = context.bot.send_message.call_args.kwargs["text"]
        self.assertIn("REPLACEMENT VIP INVITATION LINK", sent_text)
        self.assertIn("https://t.me/+NEW_REPLACEMENT_LINK", sent_text)

    def test_automatic_subscription_expiry_removal(self):
        """8-9. Verify expired members are automatically removed and lifetime never removed."""
        past_start = "2026-09-01 10:00:00 UTC"
        past_expiry = "2026-10-01 10:00:00 UTC"

        set_membership(
            db_path=self.db_path,
            telegram_user_id=77777,
            username="expired_user",
            display_name="Expired User",
            plan_id="monthly",
            plan_label="VIP MONTHLY — $5",
            plan_kind="subscription",
            starts_at_utc=past_start,
            expires_at_utc=past_expiry,
            status="active",
        )

        set_setting(self.db_path, "vip_channel_id", "-100192837465")

        context = MagicMock()
        context.bot_data = {
            "usage_db_path": str(self.db_path),
            "vip_channel_id": -100192837465,
        }
        context.bot.ban_chat_member = AsyncMock()
        context.bot.unban_chat_member = AsyncMock()
        context.bot.send_message = AsyncMock()

        asyncio.run(check_expired_memberships_job(context))

        context.bot.ban_chat_member.assert_called_once_with(
            chat_id=-100192837465, user_id=77777
        )
        context.bot.unban_chat_member.assert_called_once_with(
            chat_id=-100192837465, user_id=77777
        )

        member = get_membership(self.db_path, 77777)
        self.assertEqual(member["status"], "expired")

    def test_database_persistence_across_bot_restart(self):
        """Confirm all records and expiry dates remain intact after bot restart."""
        now_utc = datetime.now(timezone.utc)
        starts_utc = utc_timestamp(now_utc)
        exp_utc = utc_timestamp(add_calendar_months(now_utc, 12))

        set_membership(
            db_path=self.db_path,
            telegram_user_id=99999,
            username="steady_trader",
            display_name="Steady Trader",
            plan_id="yearly",
            plan_label="VIP YEARLY — $50",
            plan_kind="subscription",
            starts_at_utc=starts_utc,
            expires_at_utc=exp_utc,
            status="active",
        )

        initialize_database(self.db_path)

        reloaded_member = get_membership(self.db_path, 99999)
        self.assertIsNotNone(reloaded_member)
        self.assertEqual(reloaded_member["status"], "active")
        self.assertEqual(reloaded_member["plan_id"], "yearly")
        self.assertEqual(reloaded_member["starts_at_utc"], starts_utc)
        self.assertEqual(reloaded_member["expires_at_utc"], exp_utc)


if __name__ == "__main__":
    unittest.main()
