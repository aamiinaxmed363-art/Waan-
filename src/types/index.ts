export type PlanId = "monthly" | "half_year" | "yearly" | "lifetime";

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  price: string;
  durationMonths: number | null; // null = lifetime
  badge?: string;
  features: string[];
}

export interface InvitePlan {
  id: PlanId;
  name: string;
  requirement: string;
  durationMonths: number | null; // null = lifetime
  badge?: string;
  features: string[];
}

export interface UserProfile {
  telegramUserId: number;
  username: string;
  displayName: string;
  firstSeenAtUtc: string;
  lastSeenAtUtc: string;
}

export type PaymentStatus = "pending" | "approved" | "rejected" | "delivery_failed";

export interface PaymentSubmission {
  id: number;
  telegramUserId: number;
  username: string;
  displayName: string;
  planId: PlanId;
  planLabel: string;
  walletAddress: string;
  screenshotUrl: string;
  screenshotMediaType: "photo" | "document";
  status: PaymentStatus;
  createdAtUtc: string;
  reviewedAtUtc?: string | null;
  reviewerId?: number | null;
}

export interface MembershipRecord {
  id: string;
  telegramUserId: number;
  username: string;
  displayName: string;
  planId: PlanId;
  planLabel: string;
  planKind: "subscription" | "invite";
  startsAtUtc: string;
  expiresAtUtc: string | null; // null = Lifetime
  status: "active" | "expired" | "scheduled";
}

export interface TrackingEvent {
  id: number;
  telegramUserId: number;
  eventType: "open" | "subscription" | "invite";
  planId: string | null;
  planLabel: string | null;
  usernameSnapshot: string | null;
  displayNameSnapshot: string;
  createdAtUtc: string;
}

export interface ChannelInvite {
  id: number;
  telegramUserId: number;
  channelId: number;
  planKind: "subscription" | "invite";
  planId: PlanId;
  inviteHash: string;
  inviteLink?: string;
  status: "pending" | "activated" | "cancelled";
  createdAtUtc: string;
  activatedAtUtc?: string | null;
}

export interface BotStats {
  totalUsers: number;
  openEvents: number;
  totalSelections: number;
  planCounts: Record<string, { selections: number; uniqueUsers: number }>;
  recentSelections: TrackingEvent[];
  accessSummary: {
    activeMemberships: number;
    pendingInvites: number;
    scheduledMemberships: number;
    expiredMemberships: number;
  };
  currentAccess: MembershipRecord[];
}
