import React, { useState } from "react";
import { X, Users, Copy, Check, ExternalLink, Sparkles, MessageCircle } from "lucide-react";
import { InvitePlan, UserProfile } from "../types";
import { INVITE_CONTACT } from "../data/config";
import { StorageService } from "../data/storage";

interface InviteModalProps {
  plan: InvitePlan;
  currentUser: UserProfile;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  plan,
  currentUser,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [personalLink, setPersonalLink] = useState<string>(() => {
    const invite = StorageService.createInvite({
      telegramUserId: currentUser.telegramUserId,
      planId: plan.id,
      planKind: "invite",
    });
    return invite.inviteLink || `https://t.me/+ZOUMFX_${plan.id.toUpperCase()}_${currentUser.telegramUserId}`;
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(personalLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-blue-500/30 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">{plan.name}</h3>
              <p className="text-xs text-blue-400 font-medium">{plan.requirement}</p>
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
          {/* Exact confirmation text from python bot */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-blue-500/20 text-xs text-slate-300 leading-relaxed font-sans space-y-2">
            <p className="font-bold text-blue-400 text-sm flex items-center gap-1.5">
              🔥 Thank you for choosing a ZOUMFX Invite Plan!
            </p>
            <p>
              To continue, contact <strong className="text-white font-semibold">{INVITE_CONTACT}</strong> and tell him which plan you selected.
            </p>
            <p>
              He will verify your invited members and create or activate your personal VIP invitation link.
            </p>
            <p className="text-blue-300 font-medium">
              Welcome to the ZOUMFX family!
            </p>
          </div>

          {/* Generated Link Card */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Your Personal Invite Tracking Link</span>
              <span className="text-[10px] text-blue-400 uppercase font-mono">Simulated</span>
            </label>
            <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 focus-within:border-blue-500/50">
              <span className="font-mono text-xs text-blue-300 truncate select-all flex-1">
                {personalLink}
              </span>
              <button
                onClick={handleCopyLink}
                className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition shrink-0 flex items-center gap-1 text-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Share this link with traders. Once you hit {plan.requirement}, contact {INVITE_CONTACT} to claim your VIP access.
            </p>
          </div>

          {/* Direct CTA */}
          <div className="space-y-3 pt-2">
            <a
              href={`https://t.me/${INVITE_CONTACT.replace("@", "")}`}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs shadow-lg shadow-blue-500/20 transition"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Contact {INVITE_CONTACT} on Telegram</span>
              <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-xl text-xs transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
