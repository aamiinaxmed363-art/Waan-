import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  QrCode,
  Upload,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Coins,
  FileCheck2,
} from "lucide-react";
import { SubscriptionPlan, UserProfile, PaymentSubmission } from "../types";
import { WALLET_ADDRESS, PAYMENT_NETWORK, ADMIN_CONTACT } from "../data/config";
import { StorageService } from "../data/storage";

interface PaymentModalProps {
  plan: SubscriptionPlan;
  currentUser: UserProfile;
  onClose: () => void;
  onSubmissionSuccess: (submission: PaymentSubmission) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  plan,
  currentUser,
  onClose,
  onSubmissionSuccess,
}) => {
  const [step, setStep] = useState<"instructions" | "form" | "completed">("instructions");
  const [copied, setCopied] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string>("");
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [createdSubmission, setCreatedSubmission] = useState<PaymentSubmission | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(WALLET_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setScreenshotError("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    setScreenshotError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Quick preset samples for fast testing if user doesn't have an image file ready
  const useSampleScreenshot = (url: string) => {
    setScreenshotUrl(url);
    setScreenshotError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = walletAddress.trim();

    if (!trimmed) {
      setWalletError("Please enter the wallet address you sent the payment to.");
      return;
    }

    if (trimmed.length > 256) {
      setWalletError("Wallet address must be under 256 characters.");
      return;
    }

    if (!screenshotUrl) {
      setScreenshotError("Please provide a payment screenshot proof.");
      return;
    }

    setWalletError(null);
    setScreenshotError(null);

    const submission = StorageService.createSubmission({
      telegramUserId: currentUser.telegramUserId,
      username: currentUser.username,
      displayName: currentUser.displayName,
      planId: plan.id,
      planLabel: `${plan.name} — ${plan.price}`,
      walletAddress: trimmed,
      screenshotUrl,
      screenshotMediaType: "photo",
    });

    setCreatedSubmission(submission);
    setStep("completed");
    onSubmissionSuccess(submission);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">
                {plan.name} — <span className="text-amber-400">{plan.price}</span>
              </h3>
              <p className="text-xs text-slate-400">Deposit via {PAYMENT_NETWORK}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {step === "instructions" && (
            <div className="space-y-5">
              {/* Official Welcome Confirmation Note */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-amber-500/20 text-xs text-slate-300 leading-relaxed font-sans">
                <p className="font-bold text-amber-400 text-sm mb-1.5 flex items-center gap-1.5">
                  💎 Thank you for choosing ZOUMFX VIP!
                </p>
                <p className="text-slate-300 mb-2">
                  Make sure to pay using <strong className="text-white font-semibold">{PAYMENT_NETWORK}</strong>.
                </p>
                <p className="text-slate-400">
                  After sending funds, click <strong className="text-white">&quot;I HAVE PAID&quot;</strong> to submit your wallet address and transaction screenshot for instant verification by <strong className="text-amber-400">{ADMIN_CONTACT}</strong>.
                </p>
              </div>

              {/* Deposit Wallet Card */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>USDT BEP20 Wallet Address</span>
                  <span className="text-[10px] text-amber-400 uppercase font-mono">Binance Smart Chain</span>
                </label>
                <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 focus-within:border-amber-500/50">
                  <span className="font-mono text-xs text-amber-300 break-all select-all flex-1">
                    {WALLET_ADDRESS}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition shrink-0 flex items-center gap-1 text-xs"
                    title="Copy wallet address"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Amount to send */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Amount Due</p>
                  <p className="text-xl font-extrabold text-white mt-0.5">{plan.price} USDT</p>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Network</p>
                  <p className="text-sm font-bold text-amber-400 mt-1">BEP-20 (BSC)</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition text-sm"
                >
                  <span>I HAVE PAID</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 px-4 rounded-xl text-xs transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Submit Payment Verification
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Submitting as @{currentUser.username} (ID: {currentUser.telegramUserId})
                </p>
              </div>

              {/* Wallet sent from / destination */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  Wallet address you sent the payment from / to
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => {
                    setWalletAddress(e.target.value);
                    if (walletError) setWalletError(null);
                  }}
                  placeholder="e.g. 0x8887f5... or your sender address"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                />
                {walletError && (
                  <p className="text-red-400 text-xs flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{walletError}</span>
                  </p>
                )}
              </div>

              {/* Screenshot Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  Payment Screenshot Proof (Photo / Image)
                </label>

                {screenshotUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 p-2">
                    <img
                      src={screenshotUrl}
                      alt="Proof preview"
                      className="max-h-48 w-full object-contain rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setScreenshotUrl("")}
                      className="absolute top-3 right-3 bg-red-600/90 hover:bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/40">
                    <Upload className="w-7 h-7 text-amber-400 mb-2" />
                    <p className="text-xs font-semibold text-slate-200">
                      Click to upload payment screenshot
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      PNG, JPG, or WebP transaction receipt
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}

                {/* Quick sample buttons for fast testing */}
                {!screenshotUrl && (
                  <div className="pt-1">
                    <p className="text-[10px] text-slate-500 mb-1">Or test with instant demo proof:</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          useSampleScreenshot(
                            "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=600&q=80"
                          )
                        }
                        className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700"
                      >
                        Sample USDT Proof A
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          useSampleScreenshot(
                            "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80"
                          )
                        }
                        className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700"
                      >
                        Sample Receipt B
                      </button>
                    </div>
                  </div>
                )}

                {screenshotError && (
                  <p className="text-red-400 text-xs flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{screenshotError}</span>
                  </p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs shadow-lg shadow-amber-500/20 transition"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Send to Admin for Review</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep("instructions")}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 px-4 rounded-xl text-xs transition"
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {step === "completed" && createdSubmission && (
            <div className="text-center space-y-4 py-3">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-7 h-7" />
              </div>

              <div>
                <h4 className="text-base font-bold text-white">Payment Submission Recorded!</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Your payment details and screenshot were submitted for manual review by <strong className="text-amber-400">@zoumfx</strong>.
                </p>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Submission Ref:</span>
                  <span className="font-mono text-amber-400 font-bold">#{createdSubmission.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Selected Plan:</span>
                  <span className="text-white font-medium">{createdSubmission.planLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Review Status:</span>
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    PENDING ADMIN REVIEW
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Submitted (UTC+3):</span>
                  <span className="text-slate-300 font-mono text-[11px]">{createdSubmission.createdAtUtc}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                You can also test the Admin Review Portal to approve or reject this submission in real time.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-xs transition"
              >
                Close & Return
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
