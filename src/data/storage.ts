import {
  UserProfile,
  PaymentSubmission,
  MembershipRecord,
  TrackingEvent,
  ChannelInvite,
  BotStats,
  PlanId,
  PaymentStatus,
} from "../types";
import {
  DEFAULT_USER_ID,
  SUBSCRIPTION_PLANS,
  INVITE_PLANS,
  PLAN_DURATION_MONTHS,
  getUtcTimestampNow,
  addCalendarMonthsToUtc,
} from "./config";

const USERS_STORAGE_KEY = "zoumfx_vip_users";
const CURRENT_USER_KEY = "zoumfx_vip_current_user";
const SUBMISSIONS_STORAGE_KEY = "zoumfx_vip_submissions";
const MEMBERSHIPS_STORAGE_KEY = "zoumfx_vip_memberships";
const EVENTS_STORAGE_KEY = "zoumfx_vip_events";
const INVITES_STORAGE_KEY = "zoumfx_vip_invites";

// Initial seed data to reflect realistic usage
const INITIAL_USERS: UserProfile[] = [
  {
    telegramUserId: DEFAULT_USER_ID,
    username: "gold_sniper_fx",
    displayName: "Amir Khan",
    firstSeenAtUtc: "2026-10-25 14:10:00 UTC",
    lastSeenAtUtc: "2026-10-30 20:30:00 UTC",
  },
  {
    telegramUserId: 618293012,
    username: "tariq_trades",
    displayName: "Tariq Mansoor",
    firstSeenAtUtc: "2026-10-26 09:15:00 UTC",
    lastSeenAtUtc: "2026-10-30 18:45:00 UTC",
  },
  {
    telegramUserId: 729104822,
    username: "fatima_fx",
    displayName: "Fatima Noor",
    firstSeenAtUtc: "2026-10-27 11:20:00 UTC",
    lastSeenAtUtc: "2026-10-30 19:10:00 UTC",
  },
  {
    telegramUserId: 819203911,
    username: "alex_gold_scalp",
    displayName: "Alex Rivera",
    firstSeenAtUtc: "2026-10-28 08:00:00 UTC",
    lastSeenAtUtc: "2026-10-30 21:05:00 UTC",
  },
];

const INITIAL_SUBMISSIONS: PaymentSubmission[] = [
  {
    id: 101,
    telegramUserId: 618293012,
    username: "tariq_trades",
    displayName: "Tariq Mansoor",
    planId: "lifetime",
    planLabel: "VIP LIFETIME — $100",
    walletAddress: "0x8887f5610a2f6d5cd7cd1f23ca445bc7c3e2bb6d",
    screenshotUrl: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=600&q=80",
    screenshotMediaType: "photo",
    status: "pending",
    createdAtUtc: "2026-10-30 21:15:30 UTC",
  },
  {
    id: 100,
    telegramUserId: 729104822,
    username: "fatima_fx",
    displayName: "Fatima Noor",
    planId: "half_year",
    planLabel: "VIP HALF YEAR — $25",
    walletAddress: "0x8887f5610a2f6d5cd7cd1f23ca445bc7c3e2bb6d",
    screenshotUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80",
    screenshotMediaType: "photo",
    status: "approved",
    createdAtUtc: "2026-10-29 16:40:12 UTC",
    reviewedAtUtc: "2026-10-29 17:05:00 UTC",
    reviewerId: 584930219,
  },
  {
    id: 99,
    telegramUserId: 819203911,
    username: "alex_gold_scalp",
    displayName: "Alex Rivera",
    planId: "monthly",
    planLabel: "VIP MONTHLY — $5",
    walletAddress: "0x8887f5610a2f6d5cd7cd1f23ca445bc7c3e2bb6d",
    screenshotUrl: "https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?auto=format&fit=crop&w=600&q=80",
    screenshotMediaType: "photo",
    status: "approved",
    createdAtUtc: "2026-10-28 12:00:00 UTC",
    reviewedAtUtc: "2026-10-28 12:20:00 UTC",
    reviewerId: 584930219,
  },
];

const INITIAL_MEMBERSHIPS: MembershipRecord[] = [
  {
    id: "mem-1",
    telegramUserId: 729104822,
    username: "fatima_fx",
    displayName: "Fatima Noor",
    planId: "half_year",
    planLabel: "VIP HALF YEAR — $25",
    planKind: "subscription",
    startsAtUtc: "2026-10-29 17:05:00 UTC",
    expiresAtUtc: "2027-04-29 17:05:00 UTC",
    status: "active",
  },
  {
    id: "mem-2",
    telegramUserId: 819203911,
    username: "alex_gold_scalp",
    displayName: "Alex Rivera",
    planId: "monthly",
    planLabel: "VIP MONTHLY — $5",
    planKind: "subscription",
    startsAtUtc: "2026-10-28 12:20:00 UTC",
    expiresAtUtc: "2026-11-28 12:20:00 UTC",
    status: "active",
  },
];

const INITIAL_EVENTS: TrackingEvent[] = [
  {
    id: 1,
    telegramUserId: 618293012,
    eventType: "open",
    planId: null,
    planLabel: null,
    usernameSnapshot: "tariq_trades",
    displayNameSnapshot: "Tariq Mansoor",
    createdAtUtc: "2026-10-30 21:00:10 UTC",
  },
  {
    id: 2,
    telegramUserId: 618293012,
    eventType: "subscription",
    planId: "lifetime",
    planLabel: "VIP LIFETIME — $100",
    usernameSnapshot: "tariq_trades",
    displayNameSnapshot: "Tariq Mansoor",
    createdAtUtc: "2026-10-30 21:05:44 UTC",
  },
  {
    id: 3,
    telegramUserId: 729104822,
    eventType: "subscription",
    planId: "half_year",
    planLabel: "VIP HALF YEAR — $25",
    usernameSnapshot: "fatima_fx",
    displayNameSnapshot: "Fatima Noor",
    createdAtUtc: "2026-10-29 16:35:00 UTC",
  },
  {
    id: 4,
    telegramUserId: 819203911,
    eventType: "subscription",
    planId: "monthly",
    planLabel: "VIP MONTHLY — $5",
    usernameSnapshot: "alex_gold_scalp",
    displayNameSnapshot: "Alex Rivera",
    createdAtUtc: "2026-10-28 11:55:00 UTC",
  },
  {
    id: 5,
    telegramUserId: DEFAULT_USER_ID,
    eventType: "open",
    planId: null,
    planLabel: null,
    usernameSnapshot: "gold_sniper_fx",
    displayNameSnapshot: "Amir Khan",
    createdAtUtc: "2026-10-30 22:10:00 UTC",
  },
];

export class StorageService {
  private static getItem<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) return defaultValue;
      return JSON.parse(data) as T;
    } catch {
      return defaultValue;
    }
  }

  private static setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage quota or disabled
    }
  }

  static getCurrentUser(): UserProfile {
    return this.getItem<UserProfile>(CURRENT_USER_KEY, INITIAL_USERS[0]);
  }

  static setCurrentUser(user: UserProfile): void {
    this.setItem(CURRENT_USER_KEY, user);
    this.upsertUser(user);
  }

  static getUsers(): UserProfile[] {
    return this.getItem<UserProfile[]>(USERS_STORAGE_KEY, INITIAL_USERS);
  }

  static upsertUser(user: UserProfile): void {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.telegramUserId === user.telegramUserId);
    if (index >= 0) {
      users[index] = { ...users[index], ...user, lastSeenAtUtc: getUtcTimestampNow() };
    } else {
      users.push({ ...user, firstSeenAtUtc: getUtcTimestampNow(), lastSeenAtUtc: getUtcTimestampNow() });
    }
    this.setItem(USERS_STORAGE_KEY, users);
  }

  static getSubmissions(): PaymentSubmission[] {
    return this.getItem<PaymentSubmission[]>(SUBMISSIONS_STORAGE_KEY, INITIAL_SUBMISSIONS);
  }

  static createSubmission(data: {
    telegramUserId: number;
    username: string;
    displayName: string;
    planId: PlanId;
    planLabel: string;
    walletAddress: string;
    screenshotUrl: string;
    screenshotMediaType?: "photo" | "document";
  }): PaymentSubmission {
    const submissions = this.getSubmissions();
    const nextId = submissions.length > 0 ? Math.max(...submissions.map((s) => s.id)) + 1 : 101;
    const newSubmission: PaymentSubmission = {
      id: nextId,
      telegramUserId: data.telegramUserId,
      username: data.username,
      displayName: data.displayName,
      planId: data.planId,
      planLabel: data.planLabel,
      walletAddress: data.walletAddress,
      screenshotUrl: data.screenshotUrl,
      screenshotMediaType: data.screenshotMediaType || "photo",
      status: "pending",
      createdAtUtc: getUtcTimestampNow(),
    };
    submissions.unshift(newSubmission);
    this.setItem(SUBMISSIONS_STORAGE_KEY, submissions);

    // Track plan selection event as well
    this.recordEvent({
      telegramUserId: data.telegramUserId,
      eventType: "subscription",
      planId: data.planId,
      planLabel: data.planLabel,
      usernameSnapshot: data.username,
      displayNameSnapshot: data.displayName,
    });

    return newSubmission;
  }

  static transitionSubmission(
    submissionId: number,
    status: PaymentStatus,
    reviewerId: number
  ): PaymentSubmission | null {
    const submissions = this.getSubmissions();
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub || sub.status !== "pending") return null;

    sub.status = status;
    sub.reviewedAtUtc = getUtcTimestampNow();
    sub.reviewerId = reviewerId;
    this.setItem(SUBMISSIONS_STORAGE_KEY, submissions);

    // If approved, activate membership!
    if (status === "approved") {
      this.activateMembership({
        telegramUserId: sub.telegramUserId,
        username: sub.username,
        displayName: sub.displayName,
        planId: sub.planId,
        planLabel: sub.planLabel,
        planKind: "subscription",
      });
    }

    return sub;
  }

  static getMemberships(): MembershipRecord[] {
    return this.getItem<MembershipRecord[]>(MEMBERSHIPS_STORAGE_KEY, INITIAL_MEMBERSHIPS);
  }

  static activateMembership(data: {
    telegramUserId: number;
    username: string;
    displayName: string;
    planId: PlanId;
    planLabel: string;
    planKind: "subscription" | "invite";
  }): MembershipRecord {
    const memberships = this.getMemberships();
    const nowUtc = getUtcTimestampNow();
    const durationMonths = PLAN_DURATION_MONTHS[data.planId];
    const expiresAtUtc = durationMonths !== null ? addCalendarMonthsToUtc(nowUtc, durationMonths) : null;

    const existingIndex = memberships.findIndex(
      (m) => m.telegramUserId === data.telegramUserId && m.status === "active"
    );

    const newRecord: MembershipRecord = {
      id: `mem-${Date.now()}-${data.telegramUserId}`,
      telegramUserId: data.telegramUserId,
      username: data.username,
      displayName: data.displayName,
      planId: data.planId,
      planLabel: data.planLabel,
      planKind: data.planKind,
      startsAtUtc: nowUtc,
      expiresAtUtc,
      status: "active",
    };

    if (existingIndex >= 0) {
      memberships[existingIndex] = newRecord;
    } else {
      memberships.unshift(newRecord);
    }

    this.setItem(MEMBERSHIPS_STORAGE_KEY, memberships);
    return newRecord;
  }

  static getEvents(): TrackingEvent[] {
    return this.getItem<TrackingEvent[]>(EVENTS_STORAGE_KEY, INITIAL_EVENTS);
  }

  static recordEvent(data: {
    telegramUserId: number;
    eventType: "open" | "subscription" | "invite";
    planId?: string | null;
    planLabel?: string | null;
    usernameSnapshot?: string | null;
    displayNameSnapshot: string;
  }): void {
    const events = this.getEvents();
    const newId = events.length > 0 ? Math.max(...events.map((e) => e.id)) + 1 : 1;
    const newEvent: TrackingEvent = {
      id: newId,
      telegramUserId: data.telegramUserId,
      eventType: data.eventType,
      planId: data.planId || null,
      planLabel: data.planLabel || null,
      usernameSnapshot: data.usernameSnapshot || null,
      displayNameSnapshot: data.displayNameSnapshot,
      createdAtUtc: getUtcTimestampNow(),
    };
    events.unshift(newEvent);
    this.setItem(EVENTS_STORAGE_KEY, events);
  }

  static getInvites(): ChannelInvite[] {
    return this.getItem<ChannelInvite[]>(INVITES_STORAGE_KEY, []);
  }

  static createInvite(data: {
    telegramUserId: number;
    planId: PlanId;
    planKind: "subscription" | "invite";
  }): ChannelInvite {
    const invites = this.getInvites();
    const newId = invites.length > 0 ? Math.max(...invites.map((i) => i.id)) + 1 : 1;
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newInvite: ChannelInvite = {
      id: newId,
      telegramUserId: data.telegramUserId,
      channelId: -100192837465,
      planKind: data.planKind,
      planId: data.planId,
      inviteHash: `hash_${code}`,
      inviteLink: `https://t.me/+ZOUMFX_${code}`,
      status: "pending",
      createdAtUtc: getUtcTimestampNow(),
    };
    invites.unshift(newInvite);
    this.setItem(INVITES_STORAGE_KEY, invites);
    return newInvite;
  }

  static readStats(): BotStats {
    const users = this.getUsers();
    const events = this.getEvents();
    const memberships = this.getMemberships();
    const invites = this.getInvites();

    const openEvents = events.filter((e) => e.eventType === "open").length;
    const selectionEvents = events.filter((e) => e.eventType !== "open");

    const planCounts: Record<string, { selections: number; uniqueUsers: number }> = {};
    const planUserMap: Record<string, Set<number>> = {};

    [...SUBSCRIPTION_PLANS, ...INVITE_PLANS].forEach((p) => {
      const isSub = SUBSCRIPTION_PLANS.some((s) => s.id === p.id && s.name === p.name);
      const kind = isSub ? "subscription" : "invite";
      const key = `${kind}:${p.id}`;
      planCounts[key] = { selections: 0, uniqueUsers: 0 };
      planUserMap[key] = new Set();
    });

    selectionEvents.forEach((ev) => {
      if (ev.planId) {
        const key = `${ev.eventType}:${ev.planId}`;
        if (!planCounts[key]) {
          planCounts[key] = { selections: 0, uniqueUsers: 0 };
          planUserMap[key] = new Set();
        }
        planCounts[key].selections += 1;
        planUserMap[key].add(ev.telegramUserId);
      }
    });

    Object.keys(planCounts).forEach((key) => {
      planCounts[key].uniqueUsers = planUserMap[key] ? planUserMap[key].size : 0;
    });

    const activeMembers = memberships.filter((m) => m.status === "active");
    const scheduledMembers = memberships.filter((m) => m.status === "scheduled");
    const expiredMembers = memberships.filter((m) => m.status === "expired");
    const pendingInv = invites.filter((i) => i.status === "pending");

    return {
      totalUsers: users.length,
      openEvents,
      totalSelections: selectionEvents.length,
      planCounts,
      recentSelections: selectionEvents.slice(0, 10),
      accessSummary: {
        activeMemberships: activeMembers.length,
        pendingInvites: pendingInv.length,
        scheduledMemberships: scheduledMembers.length,
        expiredMemberships: expiredMembers.length,
      },
      currentAccess: memberships,
    };
  }

  static resetToDefault(): void {
    localStorage.removeItem(USERS_STORAGE_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(SUBMISSIONS_STORAGE_KEY);
    localStorage.removeItem(MEMBERSHIPS_STORAGE_KEY);
    localStorage.removeItem(EVENTS_STORAGE_KEY);
    localStorage.removeItem(INVITES_STORAGE_KEY);
  }
}
