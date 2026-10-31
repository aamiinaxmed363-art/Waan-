import React, { useState } from "react";
import { X, User, ShieldCheck, Check, Sparkles, Clock, Edit2 } from "lucide-react";
import { UserProfile, MembershipRecord } from "../types";
import { formatToUtcPlus3 } from "../data/config";
import { StorageService } from "../data/storage";

interface UserStatusModalProps {
  currentUser: UserProfile;
  membership?: MembershipRecord | null;
  onClose: () => void;
  onUpdateUser: (updated: UserProfile) => void;
}

export const UserStatusModal: React.FC<UserStatusModalProps> = ({
  currentUser,
  membership,
  onClose,
  onUpdateUser,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [telegramUserId, setTelegramUserId] = useState(currentUser.telegramUserId.toString());
  const [username, setUsername] = useState(currentUser.username);
  const [displayName, setDisplayName] = useState(currentUser.displayName);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedId = parseInt(telegramUserId, 10);
    if (isNaN(parsedId) || parsedId <= 0) return;

    const updated: UserProfile = {
      ...currentUser,
      telegramUserId: parsedId,
      username: username.replace("@", "").trim() || "anonymous",
      displayName: displayName.trim() || "Trader",
    };
    StorageService.setCurrentUser(updated);
    onUpdateUser(updated);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Your Telegram ID & Status</h3>
              <p className="text-xs text-slate-400 font-mono">/myid command output</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {!isEditing ? (
            <div className="space-y-4">
              {/* ID Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Telegram User ID:</span>
                  <span className="font-mono text-sm font-bold text-amber-400">
                    {currentUser.telegramUserId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Username:</span>
                  <span className="text-xs font-semibold text-slate-200">
                    @{currentUser.username}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Display Name:</span>
                  <span className="text-xs text-slate-300 font-medium">
                    {currentUser.displayName}
                  </span>
                </div>
              </div>

              {/* VIP Membership status */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                <p className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                  <span>VIP Access Status</span>
                  {membership ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ACTIVE MEMBER
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-400">
                      NO ACTIVE PLAN
                    </span>
                  )}
                </p>

                {membership ? (
                  <div className="space-y-1.5 text-xs">
                    <p className="text-amber-300 font-bold">{membership.planLabel}</p>
                    <p className="text-slate-400 text-[11px]">
                      Starts: {formatToUtcPlus3(membership.startsAtUtc)}
                    </p>
                    <p className="text-slate-300 text-[11px]">
                      Expires:{" "}
                      {membership.expiresAtUtc === null ? (
                        <span className="text-amber-400 font-bold">✨ Lifetime Access</span>
                      ) : (
                        formatToUtcPlus3(membership.expiresAtUtc)
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Select a VIP Subscription Plan (USDT) or Invite Plan to activate full channel access.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Switch / Edit Profile</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Telegram User ID (Numeric)</label>
                <input
                  type="number"
                  value={telegramUserId}
                  onChange={(e) => setTelegramUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. gold_sniper"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                >
                  Save Profile
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
