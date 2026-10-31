import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Image as ImageIcon,
  Bot,
  User,
  Shield,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import {
  WELCOME_MESSAGE,
  VIP_MENU_MESSAGE,
  SUBSCRIPTION_MENU_MESSAGE,
  INVITE_MENU_MESSAGE,
  SUBSCRIPTION_CONFIRMATION_MESSAGE,
  INVITE_CONFIRMATION_MESSAGE,
  SUBSCRIPTION_PLANS,
  INVITE_PLANS,
  DEFAULT_ADMIN_ID,
  formatToUtcPlus3,
  getUtcTimestampNow,
} from "../data/config";
import { StorageService } from "../data/storage";
import { UserProfile, PaymentSubmission, PlanId } from "../types";

interface MessageItem {
  id: string;
  sender: "bot" | "user" | "admin_copy";
  text?: string;
  buttons?: Array<Array<{ label: string; callbackData: string }>>;
  timestamp: string;
  imageUrl?: string;
  caption?: string;
}

interface TelegramBotSimulatorProps {
  currentUser: UserProfile;
  onRefreshData?: () => void;
}

export const TelegramBotSimulator: React.FC<TelegramBotSimulatorProps> = ({
  currentUser,
  onRefreshData,
}) => {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [paymentDraft, setPaymentDraft] = useState<{
    stage: "wallet" | "screenshot";
    planId: PlanId;
    planLabel: string;
    walletAddress?: string;
  } | null>(null);

  const [isAdminMode, setIsAdminMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize bot with /start welcome if empty
  useEffect(() => {
    if (messages.length === 0) {
      handleBotStart();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addBotMessage = (
    text: string,
    buttons?: Array<Array<{ label: string; callbackData: string }>>,
    imageUrl?: string,
    caption?: string
  ) => {
    const newMsg: MessageItem = {
      id: `bot-${Date.now()}-${Math.random()}`,
      sender: "bot",
      text,
      buttons,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      imageUrl,
      caption,
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  const addUserMessage = (text: string) => {
    const newMsg: MessageItem = {
      id: `user-${Date.now()}-${Math.random()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  const handleBotStart = () => {
    StorageService.recordEvent({
      telegramUserId: currentUser.telegramUserId,
      eventType: "open",
      usernameSnapshot: currentUser.username,
      displayNameSnapshot: currentUser.displayName,
    });

    addBotMessage(WELCOME_MESSAGE, [
      [{ label: "💎 VIP PLANS", callbackData: "nav:vip" }],
    ]);
  };

  const handleCallback = (callbackData: string) => {
    // Show user tapped button in transcript
    let buttonLabel = callbackData;

    if (callbackData === "nav:welcome") {
      addUserMessage("Back");
      addBotMessage(WELCOME_MESSAGE, [
        [{ label: "💎 VIP PLANS", callbackData: "nav:vip" }],
      ]);
      return;
    }

    if (callbackData === "nav:vip") {
      addUserMessage("💎 VIP PLANS");
      addBotMessage(VIP_MENU_MESSAGE, [
        [{ label: "Subscription Plans", callbackData: "nav:subscriptions" }],
        [{ label: "Invite Plans", callbackData: "nav:invites" }],
        [{ label: "Back", callbackData: "nav:welcome" }],
      ]);
      return;
    }

    if (callbackData === "nav:subscriptions") {
      addUserMessage("Subscription Plans");
      const rows = SUBSCRIPTION_PLANS.map((p) => [
        { label: `${p.name} — ${p.price}`, callbackData: `sub:${p.id}` },
      ]);
      rows.push([{ label: "Back", callbackData: "nav:vip" }]);
      addBotMessage(SUBSCRIPTION_MENU_MESSAGE, rows);
      return;
    }

    if (callbackData === "nav:invites") {
      addUserMessage("Invite Plans");
      const rows = INVITE_PLANS.map((p) => [
        { label: `${p.name} — ${p.requirement}`, callbackData: `invite:${p.id}` },
      ]);
      rows.push([{ label: "Back", callbackData: "nav:vip" }]);
      addBotMessage(INVITE_MENU_MESSAGE, rows);
      return;
    }

    if (callbackData.startsWith("sub:")) {
      const planId = callbackData.split(":")[1] as PlanId;
      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
      if (plan) {
        addUserMessage(`${plan.name} — ${plan.price}`);
        StorageService.recordEvent({
          telegramUserId: currentUser.telegramUserId,
          eventType: "subscription",
          planId: plan.id,
          planLabel: `${plan.name} — ${plan.price}`,
          usernameSnapshot: currentUser.username,
          displayNameSnapshot: currentUser.displayName,
        });

        addBotMessage(SUBSCRIPTION_CONFIRMATION_MESSAGE, [
          [{ label: "I HAVE PAID", callbackData: `payment:paid:${plan.id}` }],
          [{ label: "Back", callbackData: "nav:subscriptions" }],
        ]);
      }
      return;
    }

    if (callbackData.startsWith("invite:")) {
      const planId = callbackData.split(":")[1] as PlanId;
      const plan = INVITE_PLANS.find((p) => p.id === planId);
      if (plan) {
        addUserMessage(`${plan.name} — ${plan.requirement}`);
        StorageService.recordEvent({
          telegramUserId: currentUser.telegramUserId,
          eventType: "invite",
          planId: plan.id,
          planLabel: `${plan.name} — ${plan.requirement}`,
          usernameSnapshot: currentUser.username,
          displayNameSnapshot: currentUser.displayName,
        });

        addBotMessage(INVITE_CONFIRMATION_MESSAGE, [
          [{ label: "Back", callbackData: "nav:invites" }],
        ]);
      }
      return;
    }

    if (callbackData.startsWith("payment:paid:")) {
      const planId = callbackData.split(":")[2] as PlanId;
      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
      if (plan) {
        addUserMessage("I HAVE PAID");
        setPaymentDraft({
          stage: "wallet",
          planId: plan.id,
          planLabel: `${plan.name} — ${plan.price}`,
        });

        addBotMessage(
          "Please send the wallet address you sent the payment to.",
          [[{ label: "Cancel", callbackData: "payment:cancel" }]]
        );
      }
      return;
    }

    if (callbackData === "payment:cancel") {
      setPaymentDraft(null);
      addUserMessage("Cancel");
      addBotMessage("Payment submission cancelled.", [
        [{ label: "Back", callbackData: "nav:subscriptions" }],
      ]);
      return;
    }

    // Admin decision buttons
    if (callbackData.startsWith("pay:approve:") || callbackData.startsWith("pay:reject:")) {
      const parts = callbackData.split(":");
      const action = parts[1];
      const submissionId = Number(parts[2]);

      const updated = StorageService.transitionSubmission(
        submissionId,
        action === "approve" ? "approved" : "rejected",
        DEFAULT_ADMIN_ID
      );

      if (updated) {
        onRefreshData?.();
        if (action === "approve") {
          addBotMessage(
            "✅ PAYMENT SUCCESSFUL\n\nYour payment has been approved. Thank you for joining ZOUMFX VIP!"
          );
        } else {
          addBotMessage(
            "❌ PAYMENT REJECTED\n\nYour payment was rejected. Please contact @zoumfx if you need help."
          );
        }
      }
      return;
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    addUserMessage(text);

    // Command handling
    if (text === "/start" || text === "/help") {
      setPaymentDraft(null);
      handleBotStart();
      return;
    }

    if (text === "/myid") {
      addBotMessage(
        `Your Telegram user ID: ${currentUser.telegramUserId}\nUsername: @${currentUser.username}`
      );
      return;
    }

    if (text === "/cancel") {
      setPaymentDraft(null);
      addBotMessage("Payment submission cancelled.");
      return;
    }

    if (text === "/stats") {
      const stats = StorageService.readStats();
      const lines = [
        "📊 ZOUMFX VIP Bot Stats",
        `👥 Unique users: ${stats.totalUsers}`,
        `▶️ Opens (/start and /help): ${stats.openEvents}`,
        `💎 Plan selections: ${stats.totalSelections}`,
        "",
        "Subscription plans:",
      ];

      SUBSCRIPTION_PLANS.forEach((p) => {
        const item = stats.planCounts[`subscription:${p.id}`] || { selections: 0, uniqueUsers: 0 };
        lines.push(
          `• ${p.name} — ${p.price}: ${item.selections} selection${item.selections !== 1 ? "s" : ""}, ${item.uniqueUsers} ${item.uniqueUsers !== 1 ? "people" : "person"}`
        );
      });

      lines.push("", "Invite plans:");
      INVITE_PLANS.forEach((p) => {
        const item = stats.planCounts[`invite:${p.id}`] || { selections: 0, uniqueUsers: 0 };
        lines.push(
          `• ${p.name} — ${p.requirement}: ${item.selections} selection${item.selections !== 1 ? "s" : ""}, ${item.uniqueUsers} ${item.uniqueUsers !== 1 ? "people" : "person"}`
        );
      });

      lines.push("", "Private channel access:",
        `• Active: ${stats.accessSummary.activeMemberships}`,
        `• Waiting to join: ${stats.accessSummary.pendingInvites}`,
        `• Scheduled renewals: ${stats.accessSummary.scheduledMemberships}`,
        `• Expired: ${stats.accessSummary.expiredMemberships}`
      );

      addBotMessage(lines.join("\n"));
      return;
    }

    // Payment conversation flow
    if (paymentDraft && paymentDraft.stage === "wallet") {
      setPaymentDraft({
        ...paymentDraft,
        walletAddress: text,
        stage: "screenshot",
      });

      addBotMessage(
        "Now send your payment screenshot as a photo or image file.",
        [[{ label: "Cancel", callbackData: "payment:cancel" }]]
      );
      return;
    }

    if (paymentDraft && paymentDraft.stage === "screenshot") {
      addBotMessage(
        "Please upload a screenshot image or tap the photo icon below to complete submission.",
        [[{ label: "Cancel", callbackData: "payment:cancel" }]]
      );
      return;
    }

    // Default response
    addBotMessage(
      "Send /start to browse VIP plans, /myid to view your numeric Telegram ID, or /stats for bot metrics."
    );
  };

  const handleSendPhoto = (customUrl?: string) => {
    if (!paymentDraft || paymentDraft.stage !== "screenshot") {
      addBotMessage("Please select a VIP plan first by tapping /start or 💎 VIP PLANS.");
      return;
    }

    const screenshotUrl =
      customUrl ||
      "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=600&q=80";

    const submission = StorageService.createSubmission({
      telegramUserId: currentUser.telegramUserId,
      username: currentUser.username,
      displayName: currentUser.displayName,
      planId: paymentDraft.planId,
      planLabel: paymentDraft.planLabel,
      walletAddress: paymentDraft.walletAddress || "0x8887f5610a2f6d5cd7cd1f23ca445bc7c3e2bb6d",
      screenshotUrl,
      screenshotMediaType: "photo",
    });

    setPaymentDraft(null);
    onRefreshData?.();

    addUserMessage("📷 [Photo Screenshot Sent]");

    addBotMessage(
      "Your payment details and screenshot were sent to the admin for review. I will notify you after a decision."
    );

    // Simulate Admin Copy message preview in chat
    setTimeout(() => {
      const caption = `💳 VIP PAYMENT SUBMISSION #${submission.id}\nCustomer: ${currentUser.displayName}\nUsername: @${currentUser.username}\nTelegram ID: ${currentUser.telegramUserId}\nSelected plan: ${paymentDraft.planLabel}\nWallet address provided: ${paymentDraft.walletAddress}\nSubmitted: ${formatToUtcPlus3(submission.createdAtUtc)}`;

      const adminCopyMsg: MessageItem = {
        id: `admin-${Date.now()}`,
        sender: "admin_copy",
        imageUrl: screenshotUrl,
        caption,
        buttons: [
          [
            { label: "APPROVE PAYMENT", callbackData: `pay:approve:${submission.id}` },
            { label: "REJECT PAYMENT", callbackData: `pay:reject:${submission.id}` },
          ],
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, adminCopyMsg]);
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Simulator Card Shell */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[750px]">
        {/* Telegram Top Bar */}
        <div className="bg-[#17212b] border-b border-[#242f3d] px-5 py-3.5 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-[#17212b] rounded-full flex items-center justify-center font-bold text-amber-400 text-sm">
                Z
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm">ZOUMFX VIP Bot</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1 rounded font-mono">bot</span>
              </div>
              <p className="text-[11px] text-slate-400">@zoumfx_vip_bot • online</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMessages([]);
                setPaymentDraft(null);
                setTimeout(handleBotStart, 100);
              }}
              className="p-1.5 rounded-lg bg-[#242f3d] hover:bg-[#2b394a] text-slate-300 text-xs flex items-center gap-1"
              title="Restart bot conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Telegram Chat Wallpaper Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0e1621] font-sans">
          <div className="text-center my-2">
            <span className="text-[11px] bg-[#182533] text-slate-400 px-3 py-1 rounded-full font-medium">
              Today
            </span>
          </div>

          {messages.map((msg) => {
            const isUser = msg.sender === "user";
            const isAdminCopy = msg.sender === "admin_copy";

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isUser ? "items-end" : "items-start"
                } max-w-full`}
              >
                {/* Admin forwarded preview badge */}
                {isAdminCopy && (
                  <span className="text-[10px] uppercase font-bold text-amber-400 mb-1 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Admin Incoming Review Copy (Directly in Telegram)
                  </span>
                )}

                <div
                  className={`rounded-2xl p-3.5 text-xs sm:text-sm max-w-[85%] sm:max-w-[75%] shadow-md whitespace-pre-wrap ${
                    isUser
                      ? "bg-[#2b5278] text-white rounded-br-none"
                      : isAdminCopy
                      ? "bg-[#232e3c] border border-amber-500/30 text-slate-100 rounded-bl-none"
                      : "bg-[#182533] text-slate-100 rounded-bl-none"
                  }`}
                >
                  {/* Photo if attached */}
                  {msg.imageUrl && (
                    <div className="mb-2.5 rounded-xl overflow-hidden border border-[#2b394a]">
                      <img
                        src={msg.imageUrl}
                        alt="Submitted proof"
                        className="max-h-60 w-full object-cover"
                      />
                    </div>
                  )}

                  {msg.caption ? (
                    <p className="font-mono text-xs leading-relaxed text-amber-200">{msg.caption}</p>
                  ) : (
                    <p className="leading-relaxed">{msg.text}</p>
                  )}

                  <div className="flex justify-end mt-1 text-[10px] text-slate-400 font-mono">
                    {msg.timestamp}
                  </div>
                </div>

                {/* Inline Keyboard Buttons */}
                {msg.buttons && msg.buttons.length > 0 && (
                  <div className="mt-2 space-y-1.5 w-[85%] sm:w-[75%]">
                    {msg.buttons.map((row, rIdx) => (
                      <div key={rIdx} className="flex gap-2">
                        {row.map((btn, bIdx) => (
                          <button
                            key={bIdx}
                            onClick={() => handleCallback(btn.callbackData)}
                            className="flex-1 bg-[#242f3d] hover:bg-[#2e3d4e] active:bg-[#394b60] border border-[#2e3d4e] text-slate-200 hover:text-white text-xs font-semibold py-2 px-3 rounded-xl transition text-center shadow"
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Commands Tray */}
        <div className="bg-[#17212b] border-t border-[#242f3d] px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Bot Commands:</span>
          <button
            onClick={() => {
              setInputText("/start");
            }}
            className="px-2.5 py-1 rounded-lg bg-[#242f3d] hover:bg-[#2d3a4d] text-amber-400 font-mono text-[11px] shrink-0"
          >
            /start
          </button>
          <button
            onClick={() => {
              setInputText("/myid");
            }}
            className="px-2.5 py-1 rounded-lg bg-[#242f3d] hover:bg-[#2d3a4d] text-slate-300 font-mono text-[11px] shrink-0"
          >
            /myid
          </button>
          <button
            onClick={() => {
              setInputText("/stats");
            }}
            className="px-2.5 py-1 rounded-lg bg-[#242f3d] hover:bg-[#2d3a4d] text-slate-300 font-mono text-[11px] shrink-0"
          >
            /stats
          </button>
          <button
            onClick={() => {
              setInputText("/cancel");
            }}
            className="px-2.5 py-1 rounded-lg bg-[#242f3d] hover:bg-[#2d3a4d] text-slate-300 font-mono text-[11px] shrink-0"
          >
            /cancel
          </button>

          {paymentDraft?.stage === "screenshot" && (
            <button
              onClick={() => handleSendPhoto()}
              className="ml-auto px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 shrink-0"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Simulate Send Photo</span>
            </button>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSendText}
          className="bg-[#17212b] border-t border-[#242f3d] p-3 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              paymentDraft?.stage === "wallet"
                ? "Type wallet address..."
                : paymentDraft?.stage === "screenshot"
                ? "Send screenshot image or use quick command..."
                : "Type message or command (/start, /myid, /stats)..."
            }
            className="flex-1 bg-[#242f3d] text-white placeholder:text-slate-500 px-4 py-2.5 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
          />

          <button
            type="submit"
            className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
