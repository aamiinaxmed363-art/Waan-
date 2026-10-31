"""Exact ZOUMFX VIP messages and plan labels."""

SUBSCRIPTION_PLANS = [
    {"id": "monthly", "name": "VIP MONTHLY", "price": "$5"},
    {"id": "half_year", "name": "VIP HALF YEAR", "price": "$25"},
    {"id": "yearly", "name": "VIP YEARLY", "price": "$50"},
    {"id": "lifetime", "name": "VIP LIFETIME", "price": "$100"},
]

INVITE_PLANS = [
    {"id": "monthly", "name": "MONTHLY INVITE", "requirement": "10"},
    {"id": "half_year", "name": "HALF YEAR INVITE", "requirement": "30"},
    {"id": "yearly", "name": "YEARLY INVITE", "requirement": "70"},
    {"id": "lifetime", "name": "LIFETIME INVITE", "requirement": "125"},
]

WELCOME_MESSAGE = (
    "👋 Welcome to ZOUMFX VIP!\n\n"
    "I'm ZOUM, an experienced XAUUSD (Gold) trader with over 5 years of trading experience.\n\n"
    "My focus is precision, market analysis, risk management, and consistency. Through my trading journey, I've developed my own approach to reading the gold market and identifying high-quality trading opportunities.\n\n"
    "Here, you'll discover different ways to become part of the ZOUMFX VIP community.\n\n"
    "Are you ready to explore the plans?\n\n"
    "👇 Tap VIP PLANS below."
)

VIP_MENU_MESSAGE = "Choose a VIP plan:"
SUBSCRIPTION_MENU_MESSAGE = "Choose a Subscription Plan:"
INVITE_MENU_MESSAGE = "Choose an Invite Plan:"

SUBSCRIPTION_CONFIRMATION_MESSAGE = (
    "💎 Thank you for choosing ZOUMFX VIP!\n\n"
    "Make sure to pay using USDT BEP20.\n\n"
    "Wallet Address:\n"
    "0x8887f5610a2f6d5cd7cd1f23ca445bc7c3e2bb6d\n\n"
    "After payment, contact @zoumfx and send your payment screenshot.\n\n"
    "I hope you will join us, sir!"
)

INVITE_CONFIRMATION_MESSAGE = (
    "🔥 Thank you for choosing a ZOUMFX Invite Plan!\n\n"
    "To continue, contact @ZOUMFXI and tell him which plan you selected.\n\n"
    "He will create your personal invitation link.\n\n"
    "Welcome to the ZOUMFX family!"
)
