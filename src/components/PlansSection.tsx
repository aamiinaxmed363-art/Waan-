import React, { useState } from "react";
import { Check, Gem, Users, Sparkles, Shield, ChevronRight } from "lucide-react";
import { SUBSCRIPTION_PLANS, INVITE_PLANS } from "../data/config";
import { SubscriptionPlan, InvitePlan } from "../types";

interface PlansSectionProps {
  onSelectSubscription: (plan: SubscriptionPlan) => void;
  onSelectInvite: (plan: InvitePlan) => void;
  activeTab: "subscription" | "invite";
  setActiveTab: (tab: "subscription" | "invite") => void;
}

export const PlansSection: React.FC<PlansSectionProps> = ({
  onSelectSubscription,
  onSelectInvite,
  activeTab,
  setActiveTab,
}) => {
  const [hoveredPlanId, setHoveredPlanId] = useState<string | null>(null);

  return (
    <section id="plans-section" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
          <Gem className="w-3.5 h-3.5" />
          <span>Transparent VIP Memberships</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
          Choose Your Path into <span className="bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent">ZOUMFX VIP</span>
        </h2>
        <p className="text-slate-400 text-sm sm:text-base">
          Join via direct USDT BEP20 subscription or earn free VIP access by referring fellow traders into our growing community.
        </p>

        {/* Tab Switcher */}
        <div className="inline-flex p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl mt-4">
          <button
            onClick={() => setActiveTab("subscription")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "subscription"
                ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Gem className="w-4 h-4" />
            <span>Subscription Plans (USDT)</span>
          </button>
          <button
            onClick={() => setActiveTab("invite")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "invite"
                ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Invite Plans (Free)</span>
          </button>
        </div>
      </div>

      {/* Subscription Plans Grid */}
      {activeTab === "subscription" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isLifetime = plan.id === "lifetime";
            const isPopular = plan.id === "half_year";
            return (
              <div
                key={plan.id}
                onMouseEnter={() => setHoveredPlanId(plan.id)}
                onMouseLeave={() => setHoveredPlanId(null)}
                className={`relative rounded-2xl flex flex-col justify-between transition-all duration-300 p-6 border ${
                  isLifetime
                    ? "bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/60 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/50"
                    : isPopular
                    ? "bg-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border shadow-md ${
                        isLifetime
                          ? "bg-amber-500 text-slate-950 border-amber-400"
                          : "bg-slate-800 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mt-1">
                    <h3 className="font-bold text-white text-base">{plan.name}</h3>
                    {isLifetime && <Sparkles className="w-4 h-4 text-amber-400" />}
                  </div>

                  <div className="mt-4 mb-6">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-xs text-slate-400 ml-1.5 font-medium">
                      / {plan.durationMonths ? `${plan.durationMonths} month${plan.durationMonths > 1 ? "s" : ""}` : "forever"}
                    </span>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-800/80">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4">
                  <button
                    onClick={() => onSelectSubscription(plan)}
                    className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      isLifetime
                        ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-md shadow-amber-500/30"
                        : "bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white border border-slate-700 hover:border-amber-500 transition"
                    }`}
                  >
                    <span>Select & Pay USDT</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <p className="text-[10px] text-center text-slate-400 mt-2">
                    Pay via USDT BEP20
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Plans Grid */}
      {activeTab === "invite" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {INVITE_PLANS.map((plan) => {
            const isLifetime = plan.id === "lifetime";
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl flex flex-col justify-between transition-all duration-300 p-6 border ${
                  isLifetime
                    ? "bg-gradient-to-b from-blue-950/40 via-slate-900 to-slate-950 border-blue-500/60 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/40"
                    : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border bg-slate-800 text-blue-400 border-blue-500/30 shadow-md">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mt-1">
                    <h3 className="font-bold text-white text-base">{plan.name}</h3>
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>

                  <div className="mt-4 mb-6">
                    <div className="text-3xl font-extrabold text-blue-400 tracking-tight">
                      {plan.requirement}
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      Target traders to refer
                    </span>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-800/80">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4">
                  <button
                    onClick={() => onSelectInvite(plan)}
                    className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-slate-800 hover:bg-blue-500 hover:text-slate-950 text-white border border-slate-700 hover:border-blue-400 transition"
                  >
                    <span>Get Invite Link</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <p className="text-[10px] text-center text-slate-400 mt-2">
                    Managed via @ZOUMFXI
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Safety & Manual Review Notice */}
      <div className="mt-12 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto text-center sm:text-left">
        <div className="flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Payment review is handled manually by <strong className="text-slate-200">@zoumfx</strong>. Submissions require providing your destination wallet and a payment screenshot.
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500">BEP20 Network Only</span>
      </div>
    </section>
  );
};
