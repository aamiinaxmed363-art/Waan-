import React from "react";
import { Sparkles, Bot, Shield, User, Coins } from "lucide-react";
import { UserProfile } from "../types";

interface HeaderProps {
  currentView: "portal" | "bot" | "admin";
  onViewChange: (view: "portal" | "bot" | "admin") => void;
  currentUser: UserProfile;
  onOpenStatusModal: () => void;
  pendingReviewsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  currentUser,
  onOpenStatusModal,
  pendingReviewsCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-amber-500/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewChange("portal")}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 p-0.5 shadow-md shadow-amber-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Coins className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-lg bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                  ZOUMFX VIP
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                  XAUUSD
                </span>
              </div>
              <p className="text-xs text-slate-400">Gold Trading Community & Bot</p>
            </div>
          </div>

          {/* Navigation Mode Switcher */}
          <nav className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onViewChange("portal")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === "portal"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>VIP Portal</span>
            </button>

            <button
              onClick={() => onViewChange("bot")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === "bot"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Bot Simulator</span>
            </button>

            <button
              onClick={() => onViewChange("admin")}
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === "admin"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Review & Stats</span>
              {pendingReviewsCount > 0 && (
                <span className="w-4 h-4 text-[10px] flex items-center justify-center rounded-full bg-red-500 text-white font-bold ml-0.5 animate-pulse">
                  {pendingReviewsCount}
                </span>
              )}
            </button>
          </nav>

          {/* User Profile / Status */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenStatusModal}
              className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 px-3 py-1.5 rounded-xl transition text-xs group"
              title="Click to view your Telegram ID & VIP Status (/myid)"
            >
              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-slate-200 font-medium leading-none">@{currentUser.username}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {currentUser.telegramUserId}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
