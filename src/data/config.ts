import { SubscriptionPlan, InvitePlan, PlanId } from "../types";

export const WALLET_ADDRESS = "0x8887f5610a2f6d5cd7cd1f23ca445bc7c3e2bb6d";
export const PAYMENT_NETWORK = "USDT BEP20";
export const ADMIN_CONTACT = "@zoumfx";
export const INVITE_CONTACT = "@ZOUMFXI";
export const DEFAULT_ADMIN_ID = 584930219;
export const DEFAULT_USER_ID = 948210452;

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "monthly",
    name: "VIP MONTHLY",
    price: "$5",
    durationMonths: 1,
    badge: "Flexible",
    features: [
      "Daily XAUUSD (Gold) High-Probability Signals",
      "Precise Entry, Stop-Loss & Take-Profit Targets",
      "Live Risk Management Guidance",
      "Community Chat Access",
      "30 Days VIP Channel Access",
    ],
  },
  {
    id: "half_year",
    name: "VIP HALF YEAR",
    price: "$25",
    durationMonths: 6,
    badge: "Popular (Save 17%)",
    features: [
      "Everything in Monthly Plan",
      "6 Months Continuous VIP Signals",
      "Weekly Gold Market Breakdown & Forecasts",
      "ZOUM's Personal Gold Trading Rules",
      "Priority Support from @zoumfx",
    ],
  },
  {
    id: "yearly",
    name: "VIP YEARLY",
    price: "$50",
    durationMonths: 12,
    badge: "Best Value (Save 17%)",
    features: [
      "Everything in Half Year Plan",
      "12 Months Uninterrupted Access",
      "Exclusive Risk Sizing Strategy Sheet",
      "Gold Macro Trends & NFP Analysis",
      "VIP Private Community Access",
    ],
  },
  {
    id: "lifetime",
    name: "VIP LIFETIME",
    price: "$100",
    durationMonths: null,
    badge: "VIP Elite",
    features: [
      "Unlimited Lifetime VIP Access — Never Pay Again",
      "All Future Updates & Strategies Included",
      "Direct 1-on-1 Mentorship & Trade Review with ZOUM",
      "VIP Inner Circle Role",
      "Highest Priority Signal Alerts",
    ],
  },
];

export const INVITE_PLANS: InvitePlan[] = [
  {
    id: "monthly",
    name: "MONTHLY INVITE",
    requirement: "10 invites",
    durationMonths: 1,
    badge: "10 Invites",
    features: [
      "Invite 10 Traders to ZOUMFX",
      "1 Month Free VIP Community Access",
      "Personal Referral Link from @ZOUMFXI",
      "Real-time Invite Tracking",
    ],
  },
  {
    id: "half_year",
    name: "HALF YEAR INVITE",
    requirement: "30 invites",
    durationMonths: 6,
    badge: "30 Invites",
    features: [
      "Invite 30 Traders to ZOUMFX",
      "6 Months Free VIP Signals",
      "Personal Referral Link from @ZOUMFXI",
      "Weekly Market Forecasts",
    ],
  },
  {
    id: "yearly",
    name: "YEARLY INVITE",
    requirement: "70 invites",
    durationMonths: 12,
    badge: "70 Invites",
    features: [
      "Invite 70 Traders to ZOUMFX",
      "1 Year Free VIP Access",
      "Special Contributor Badge in Community",
      "Personal Referral Link from @ZOUMFXI",
    ],
  },
  {
    id: "lifetime",
    name: "LIFETIME INVITE",
    requirement: "125 invites",
    durationMonths: null,
    badge: "125 Invites (Top Community Tier)",
    features: [
      "Invite 125 Active Traders to ZOUMFX",
      "Permanent Lifetime Free VIP Access",
      "Official ZOUMFX Ambassador Status",
      "Direct Access to ZOUM Inner Circle",
    ],
  },
];

export const WELCOME_MESSAGE = `👋 Welcome to ZOUMFX VIP!

I'm ZOUM, an experienced XAUUSD (Gold) trader with over 5 years of trading experience.

My focus is precision, market analysis, risk management, and consistency. Through my trading journey, I've developed my own approach to reading the gold market and identifying high-quality trading opportunities.

Here, you'll discover different ways to become part of the ZOUMFX VIP community.

Are you ready to explore the plans?

👇 Tap VIP PLANS below.`;

export const VIP_MENU_MESSAGE = "Choose a VIP plan:";
export const SUBSCRIPTION_MENU_MESSAGE = "Choose a Subscription Plan:";
export const INVITE_MENU_MESSAGE = "Choose an Invite Plan:";

export const SUBSCRIPTION_CONFIRMATION_MESSAGE = `💎 Thank you for choosing ZOUMFX VIP!

Make sure to pay using USDT BEP20.

Wallet Address:
0x8887f5610a2f6d5cd7cd1f23ca445bc7c3e2bb6d

After payment, contact @zoumfx and send your payment screenshot.

I hope you will join us, sir!`;

export const INVITE_CONFIRMATION_MESSAGE = `🔥 Thank you for choosing a ZOUMFX Invite Plan!

To continue, contact @ZOUMFXI and tell him which plan you selected.

He will create your personal invitation link.

Welcome to the ZOUMFX family!`;

export const PLAN_DURATION_MONTHS: Record<PlanId, number | null> = {
  monthly: 1,
  half_year: 6,
  yearly: 12,
  lifetime: null,
};

// Date / Time utilities replicating Python UTC and UTC+3 behavior
export function getUtcTimestampNow(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = now.getUTCFullYear();
  const month = pad(now.getUTCMonth() + 1);
  const day = pad(now.getUTCDate());
  const hours = pad(now.getUTCHours());
  const minutes = pad(now.getUTCMinutes());
  const seconds = pad(now.getUTCSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}

export function formatToUtcPlus3(utcString: string): string {
  try {
    const clean = utcString.replace(" UTC", "Z");
    const date = new Date(clean);
    if (isNaN(date.getTime())) return utcString;

    // Shift to UTC+3 (180 mins)
    const utcTime = date.getTime();
    const plus3Time = new Date(utcTime + 3 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = plus3Time.getUTCFullYear();
    const month = pad(plus3Time.getUTCMonth() + 1);
    const day = pad(plus3Time.getUTCDate());
    const hours = pad(plus3Time.getUTCHours());
    const minutes = pad(plus3Time.getUTCMinutes());
    const seconds = pad(plus3Time.getUTCSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC+3`;
  } catch {
    return utcString;
  }
}

export function addCalendarMonthsToUtc(startUtcString: string, months: number): string {
  const clean = startUtcString.replace(" UTC", "Z");
  const date = new Date(clean);
  const originalDay = date.getUTCDate();
  
  // Calculate new year and month
  const totalMonths = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = totalMonths % 12;

  // Clamping day to month length (like Python calendar.monthrange)
  const daysInNewMonth = new Date(Date.UTC(newYear, newMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(originalDay, daysInNewMonth);

  const newDate = new Date(Date.UTC(
    newYear,
    newMonth,
    clampedDay,
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  ));

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${newDate.getUTCFullYear()}-${pad(newDate.getUTCMonth() + 1)}-${pad(newDate.getUTCDate())} ${pad(newDate.getUTCHours())}:${pad(newDate.getUTCMinutes())}:${pad(newDate.getUTCSeconds())} UTC`;
}
