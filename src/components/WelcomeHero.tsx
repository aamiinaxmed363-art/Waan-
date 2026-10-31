import React from "react";
import { TrendingUp, ShieldCheck, Target, Award, ArrowRight, Zap, CheckCircle2 } from "lucide-react";

interface WelcomeHeroProps {
  onExplorePlans: () => void;
  onExploreInvites: () => void;
}

export const WelcomeHero: React.FC<WelcomeHeroProps> = ({
  onExplorePlans,
  onExploreInvites,
}) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-b border-slate-800/80 py-16 lg:py-20">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-amber-500/10 via-yellow-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Main Story & Brief */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Official ZOUMFX VIP Community</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Master <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">XAUUSD (Gold)</span> with 5+ Years of Proven Precision
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              👋 <strong className="text-white">I&apos;m ZOUM</strong>, an experienced XAUUSD (Gold) trader with over 5 years of hands-on trading experience.
              My focus is <span className="text-amber-400 font-semibold">precision</span>, <span className="text-amber-400 font-semibold">market analysis</span>, <span className="text-amber-400 font-semibold">strict risk management</span>, and <span className="text-amber-400 font-semibold">consistency</span>.
            </p>

            <p className="text-slate-400 text-sm leading-relaxed">
              Through my trading journey, I&apos;ve developed my own proprietary approach to reading the gold market and identifying high-probability trading opportunities. Here, you&apos;ll discover different ways to become part of the ZOUMFX VIP family.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onExplorePlans}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 text-sm"
              >
                <span>💎 Tap VIP PLANS</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onExploreInvites}
                className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold px-5 py-3 rounded-xl border border-slate-700 hover:border-amber-500/40 transition text-sm"
              >
                <span>🤝 Join via Invites</span>
              </button>
            </div>

            {/* Micro Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>USDT BEP20 Payment</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Manual Admin Verification</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Free Invite Options</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Lifetime VIP Tier</span>
              </div>
            </div>
          </div>

          {/* Pillars Card */}
          <div className="lg:col-span-5">
            <div className="bg-slate-950/80 rounded-2xl p-6 border border-amber-500/20 shadow-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full pointer-events-none" />
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-white text-base">ZOUM&apos;s Core Pillars</h3>
                  <p className="text-xs text-slate-400">Why traders trust the ZOUMFX VIP edge</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Award className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-4 mt-5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Precision & Timing</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Exact entries, invalidation levels, and partial take-profit milestones tailored for XAUUSD liquidity sweeps.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Strict Risk Management</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Never risk more than 1-2% per setup. Capital preservation is the golden rule of trading consistency.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Market Structure & Flow</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Decoding institutional order flow, London & New York session spikes, and economic high-impact drivers.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bot Direct Mention */}
              <div className="mt-5 pt-4 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                <span>Direct Admin Contact:</span>
                <span className="text-amber-400 font-mono font-medium">@zoumfx & @ZOUMFXI</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
