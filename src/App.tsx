import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { WelcomeHero } from "./components/WelcomeHero";
import { PlansSection } from "./components/PlansSection";
import { PaymentModal } from "./components/PaymentModal";
import { InviteModal } from "./components/InviteModal";
import { TelegramBotSimulator } from "./components/TelegramBotSimulator";
import { AdminDashboard } from "./components/AdminDashboard";
import { UserStatusModal } from "./components/UserStatusModal";
import { StorageService } from "./data/storage";
import {
  UserProfile,
  SubscriptionPlan,
  InvitePlan,
  PaymentSubmission,
  MembershipRecord,
  BotStats,
} from "./types";
import { ADMIN_CONTACT, INVITE_CONTACT } from "./data/config";
import { Shield, Bot } from "lucide-react";

export function App() {
  const [currentView, setCurrentView] = useState<"portal" | "bot" | "admin">("portal");
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => StorageService.getCurrentUser());
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>(() => StorageService.getSubmissions());
  const [memberships, setMemberships] = useState<MembershipRecord[]>(() => StorageService.getMemberships());
  const [stats, setStats] = useState<BotStats>(() => StorageService.readStats());

  const [activePlanTab, setActivePlanTab] = useState<"subscription" | "invite">("subscription");
  const [selectedSubPlan, setSelectedSubPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedInvitePlan, setSelectedInvitePlan] = useState<InvitePlan | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const refreshData = () => {
    setSubmissions(StorageService.getSubmissions());
    setMemberships(StorageService.getMemberships());
    setStats(StorageService.readStats());
  };

  useEffect(() => {
    // Record page open event for the user
    StorageService.recordEvent({
      telegramUserId: currentUser.telegramUserId,
      eventType: "open",
      usernameSnapshot: currentUser.username,
      displayNameSnapshot: currentUser.displayName,
    });
    refreshData();
  }, [currentUser]);

  const handleSelectSubscription = (plan: SubscriptionPlan) => {
    setSelectedSubPlan(plan);
  };

  const handleSelectInvite = (plan: InvitePlan) => {
    StorageService.recordEvent({
      telegramUserId: currentUser.telegramUserId,
      eventType: "invite",
      planId: plan.id,
      planLabel: `${plan.name} — ${plan.requirement}`,
      usernameSnapshot: currentUser.username,
      displayNameSnapshot: currentUser.displayName,
    });
    refreshData();
    setSelectedInvitePlan(plan);
  };

  const handleSubmissionSuccess = (submission: PaymentSubmission) => {
    refreshData();
  };

  const currentMembership = memberships.find(
    (m) => m.telegramUserId === currentUser.telegramUserId && m.status === "active"
  );

  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Header */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        currentUser={currentUser}
        onOpenStatusModal={() => setIsStatusModalOpen(true)}
        pendingReviewsCount={pendingCount}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === "portal" && (
          <div>
            <WelcomeHero
              onExplorePlans={() => {
                setActivePlanTab("subscription");
                document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              onExploreInvites={() => {
                setActivePlanTab("invite");
                document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" });
              }}
            />

            <PlansSection
              onSelectSubscription={handleSelectSubscription}
              onSelectInvite={handleSelectInvite}
              activeTab={activePlanTab}
              setActiveTab={setActivePlanTab}
            />

            {/* Quick Experience Switcher Card */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
              <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/30 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Bot className="w-5 h-5 text-amber-400" />
                    <span>Try the Full Telegram Bot Experience</span>
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
                    Test the exact `/start`, inline keyboards, USDT wallet copy, and `/stats` commands directly in the embedded Telegram simulator.
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button
                    onClick={() => setCurrentView("bot")}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-2"
                  >
                    <Bot className="w-4 h-4" />
                    <span>Launch Bot Simulator</span>
                  </button>
                  <button
                    onClick={() => setCurrentView("admin")}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>Admin Review ({pendingCount})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === "bot" && (
          <TelegramBotSimulator
            currentUser={currentUser}
            onRefreshData={refreshData}
          />
        )}

        {currentView === "admin" && (
          <AdminDashboard
            submissions={submissions}
            memberships={memberships}
            stats={stats}
            onRefreshData={refreshData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300">ZOUMFX VIP</span>
              <span>•</span>
              <span>XAUUSD Gold Specialist Community</span>
            </div>

            <div className="flex items-center gap-4 text-slate-400">
              <a
                href={`https://t.me/${ADMIN_CONTACT.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-amber-400 transition"
              >
                Owner: {ADMIN_CONTACT}
              </a>
              <span>•</span>
              <a
                href={`https://t.me/${INVITE_CONTACT.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-amber-400 transition"
              >
                Invites: {INVITE_CONTACT}
              </a>
            </div>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-900 pt-4">
            Disclaimer: Trading financial instruments including Gold (XAUUSD) involves substantial risk of loss and is not suitable for every investor. The signals and analysis provided by ZOUMFX VIP are for educational and informational purposes only. Past results do not guarantee future performance.
          </p>
        </div>
      </footer>

      {/* Modals */}
      {selectedSubPlan && (
        <PaymentModal
          plan={selectedSubPlan}
          currentUser={currentUser}
          onClose={() => setSelectedSubPlan(null)}
          onSubmissionSuccess={handleSubmissionSuccess}
        />
      )}

      {selectedInvitePlan && (
        <InviteModal
          plan={selectedInvitePlan}
          currentUser={currentUser}
          onClose={() => setSelectedInvitePlan(null)}
        />
      )}

      {isStatusModalOpen && (
        <UserStatusModal
          currentUser={currentUser}
          membership={currentMembership}
          onClose={() => setIsStatusModalOpen(false)}
          onUpdateUser={(updated) => {
            setCurrentUser(updated);
            refreshData();
          }}
        />
      )}
    </div>
  );
}

export default App;
