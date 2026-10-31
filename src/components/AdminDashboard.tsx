import React, { useState } from "react";
import {
  ShieldCheck,
  Check,
  X,
  Clock,
  Eye,
  Users,
  TrendingUp,
  Gem,
  Award,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Coins,
  CheckCircle2,
  XCircle,
  Calendar,
} from "lucide-react";
import {
  PaymentSubmission,
  MembershipRecord,
  BotStats,
  TrackingEvent,
  PaymentStatus,
} from "../types";
import {
  SUBSCRIPTION_PLANS,
  INVITE_PLANS,
  DEFAULT_ADMIN_ID,
  formatToUtcPlus3,
} from "../data/config";
import { StorageService } from "../data/storage";

interface AdminDashboardProps {
  submissions: PaymentSubmission[];
  memberships: MembershipRecord[];
  stats: BotStats;
  onRefreshData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  submissions,
  memberships,
  stats,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<"queue" | "stats" | "members">("queue");
  const [selectedSubmission, setSelectedSubmission] = useState<PaymentSubmission | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const pendingSubmissions = submissions.filter((s) => s.status === "pending");

  const filteredSubmissions = submissions.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.displayName.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        String(s.telegramUserId).includes(q) ||
        s.planLabel.toLowerCase().includes(q) ||
        s.walletAddress.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDecision = (submissionId: number, decision: "approved" | "rejected") => {
    StorageService.transitionSubmission(submissionId, decision, DEFAULT_ADMIN_ID);
    onRefreshData();
    if (selectedSubmission?.id === submissionId) {
      setSelectedSubmission((prev) => (prev ? { ...prev, status: decision } : null));
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Owner & Admin Management Portal</h2>
              <span className="text-xs font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                Admin ID: {DEFAULT_ADMIN_ID}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Review USDT BEP20 payments, activate VIP memberships, and inspect live bot metrics in UTC+3.
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshData}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium self-start sm:self-auto transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("queue")}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all ${
            activeTab === "queue"
              ? "border-amber-500 text-amber-400 bg-amber-500/5"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span>Payment Review Queue</span>
          {pendingSubmissions.length > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-slate-950 animate-pulse">
              {pendingSubmissions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("stats")}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all ${
            activeTab === "stats"
              ? "border-amber-500 text-amber-400 bg-amber-500/5"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span>Bot Stats & Analytics (/stats)</span>
        </button>

        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all ${
            activeTab === "members"
              ? "border-amber-500 text-amber-400 bg-amber-500/5"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span>Active VIP Members</span>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-800 text-slate-300">
            {memberships.filter((m) => m.status === "active").length}
          </span>
        </button>
      </div>

      {/* TAB 1: REVIEW QUEUE */}
      {activeTab === "queue" && (
        <div className="space-y-6">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customer, ID, or wallet..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Submissions ({submissions.length})</option>
                <option value="pending">Pending Only ({pendingSubmissions.length})</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Submissions List */}
          {filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800">
              <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">No payment submissions found</p>
              <p className="text-xs text-slate-500 mt-1">
                Submissions made through the VIP Portal or Bot Simulator will appear here for review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSubmissions.map((sub) => {
                const isPending = sub.status === "pending";
                const isApproved = sub.status === "approved";

                return (
                  <div
                    key={sub.id}
                    className={`rounded-2xl border p-5 flex flex-col justify-between transition-all bg-slate-900/90 ${
                      isPending
                        ? "border-amber-500/50 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/20"
                        : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      {/* Top status */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <span className="text-xs font-mono font-bold text-amber-400">
                          #{sub.id}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isPending
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : isApproved
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-red-500/20 text-red-300 border border-red-500/30"
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>

                      {/* Customer info */}
                      <div className="mt-4 space-y-2 text-xs">
                        <div>
                          <p className="text-slate-400 text-[11px]">Customer:</p>
                          <p className="font-semibold text-white">
                            {sub.displayName}{" "}
                            <span className="text-amber-400 font-normal">(@{sub.username})</span>
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">Telegram ID: {sub.telegramUserId}</p>
                        </div>

                        <div>
                          <p className="text-slate-400 text-[11px]">Plan Selected:</p>
                          <p className="font-bold text-white text-xs">{sub.planLabel}</p>
                        </div>

                        <div>
                          <p className="text-slate-400 text-[11px]">Submitted Wallet:</p>
                          <p className="font-mono text-[11px] text-slate-300 break-all bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                            {sub.walletAddress}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400 text-[11px]">Submitted (UTC+3):</p>
                          <p className="font-mono text-[11px] text-slate-400">
                            {formatToUtcPlus3(sub.createdAtUtc)}
                          </p>
                        </div>
                      </div>

                      {/* Screenshot thumbnail */}
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => setSelectedSubmission(sub)}
                          className="w-full relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-32 flex items-center justify-center cursor-pointer"
                        >
                          <img
                            src={sub.screenshotUrl}
                            alt="Receipt proof"
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition text-xs font-semibold text-white">
                            <Eye className="w-4 h-4" />
                            <span>View Full Proof</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-2">
                      {isPending ? (
                        <>
                          <button
                            onClick={() => handleDecision(sub.id, "approved")}
                            className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-emerald-600/20 transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>APPROVE</span>
                          </button>
                          <button
                            onClick={() => handleDecision(sub.id, "rejected")}
                            className="flex-1 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs flex items-center justify-center gap-1 transition"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>REJECT</span>
                          </button>
                        </>
                      ) : (
                        <div className="w-full text-center py-1 text-xs text-slate-400 flex items-center justify-center gap-1.5">
                          {isApproved ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>Approved by Admin #{sub.reviewerId || DEFAULT_ADMIN_ID}</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-red-400" />
                              <span>Rejected by Admin #{sub.reviewerId || DEFAULT_ADMIN_ID}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BOT STATS & ANALYTICS */}
      {activeTab === "stats" && (
        <div className="space-y-8">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Unique Users</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-white mt-2">{stats.totalUsers}</p>
              <p className="text-[11px] text-slate-500 mt-1">Tracked in local storage</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Bot Opens (/start)</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-white mt-2">{stats.openEvents}</p>
              <p className="text-[11px] text-slate-500 mt-1">Initial /start and /help hits</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Total Plan Selections</span>
                <Gem className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-black text-white mt-2">{stats.totalSelections}</p>
              <p className="text-[11px] text-slate-500 mt-1">Subscription & invite taps</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Active VIP Memberships</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-amber-400 mt-2">
                {stats.accessSummary.activeMemberships}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Verified VIP traders</p>
            </div>
          </div>

          {/* Breakdown Tables (matching exact /stats command structure) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subscription Plans Breakdown */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Subscription Plans Breakdown</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="pb-3">Plan Name & Price</th>
                      <th className="pb-3 text-center">Selections</th>
                      <th className="pb-3 text-right">Unique Users</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {SUBSCRIPTION_PLANS.map((plan) => {
                      const data = stats.planCounts[`subscription:${plan.id}`] || {
                        selections: 0,
                        uniqueUsers: 0,
                      };
                      return (
                        <tr key={plan.id} className="hover:bg-slate-800/30">
                          <td className="py-3 font-medium text-slate-200">
                            {plan.name} — <span className="text-amber-400">{plan.price}</span>
                          </td>
                          <td className="py-3 text-center font-mono text-white">{data.selections}</td>
                          <td className="py-3 text-right font-mono text-slate-300">{data.uniqueUsers}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invite Plans Breakdown */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Invite Plans Breakdown</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="pb-3">Plan Name & Requirement</th>
                      <th className="pb-3 text-center">Selections</th>
                      <th className="pb-3 text-right">Unique Users</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {INVITE_PLANS.map((plan) => {
                      const data = stats.planCounts[`invite:${plan.id}`] || {
                        selections: 0,
                        uniqueUsers: 0,
                      };
                      return (
                        <tr key={plan.id} className="hover:bg-slate-800/30">
                          <td className="py-3 font-medium text-slate-200">
                            {plan.name} — <span className="text-blue-400">{plan.requirement}</span>
                          </td>
                          <td className="py-3 text-center font-mono text-white">{data.selections}</td>
                          <td className="py-3 text-right font-mono text-slate-300">{data.uniqueUsers}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recent Plan Selections Log */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Recent Plan Selections (Displayed in UTC+3 Africa/Mogadishu)</span>
            </h3>

            {stats.recentSelections.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No recent selections logged yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="pb-3">Trader</th>
                      <th className="pb-3">Telegram ID</th>
                      <th className="pb-3">Selected Plan</th>
                      <th className="pb-3 text-right">Time (UTC+3)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {stats.recentSelections.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-800/30">
                        <td className="py-3 font-medium text-slate-200">
                          {ev.usernameSnapshot ? `@${ev.usernameSnapshot}` : ev.displayNameSnapshot}
                        </td>
                        <td className="py-3 font-mono text-slate-400">{ev.telegramUserId}</td>
                        <td className="py-3">
                          <span className="font-semibold text-amber-300">{ev.planLabel}</span>
                        </td>
                        <td className="py-3 text-right font-mono text-slate-400">
                          {formatToUtcPlus3(ev.createdAtUtc)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVE VIP MEMBERS */}
      {activeTab === "members" && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">VIP Channel Members Directory</h3>
              <p className="text-xs text-slate-400">Verified members with active access terms</p>
            </div>
            <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              Active: {memberships.filter((m) => m.status === "active").length}
            </span>
          </div>

          {memberships.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No VIP members registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="pb-3">Member</th>
                    <th className="pb-3">Telegram ID</th>
                    <th className="pb-3">Plan</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Starts At (UTC+3)</th>
                    <th className="pb-3">Expires At</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {memberships.map((mem) => {
                    const isLifetime = mem.expiresAtUtc === null;
                    return (
                      <tr key={mem.id} className="hover:bg-slate-800/30">
                        <td className="py-3 font-semibold text-white">
                          {mem.displayName}{" "}
                          <span className="text-amber-400 font-normal">(@{mem.username})</span>
                        </td>
                        <td className="py-3 font-mono text-slate-400">{mem.telegramUserId}</td>
                        <td className="py-3 font-medium text-slate-200">{mem.planLabel}</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              mem.planKind === "subscription"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            }`}
                          >
                            {mem.planKind}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-slate-400">
                          {formatToUtcPlus3(mem.startsAtUtc)}
                        </td>
                        <td className="py-3 font-mono">
                          {isLifetime ? (
                            <span className="text-amber-400 font-bold">✨ Lifetime</span>
                          ) : (
                            <span className="text-slate-300">
                              {formatToUtcPlus3(mem.expiresAtUtc!)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              mem.status === "active"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {mem.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Proof Inspection Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="font-bold text-white text-base">
                Submission Proof #{selectedSubmission.id} — {selectedSubmission.displayName}
              </h4>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center max-h-[480px]">
              <img
                src={selectedSubmission.screenshotUrl}
                alt="Payment proof"
                className="max-h-[460px] w-auto object-contain"
              />
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex justify-between items-center">
              <div>
                <p className="text-slate-400">Submitted Destination Wallet:</p>
                <p className="font-mono text-amber-300 text-xs mt-0.5">{selectedSubmission.walletAddress}</p>
              </div>
              {selectedSubmission.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDecision(selectedSubmission.id, "approved")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDecision(selectedSubmission.id, "rejected")}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
