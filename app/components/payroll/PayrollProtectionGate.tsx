"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { payrollOtpApi } from "@/services/payrollOtpApi";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

interface PayrollProtectionGateProps {
  children: React.ReactNode;
}

export default function PayrollProtectionGate({ children }: PayrollProtectionGateProps) {
  const { user } = useAuthStore();
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  // OTP Form states
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string>("");
  const [cooldown, setCooldown] = useState<number>(0);
  const [otpSent, setOtpSent] = useState<boolean>(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasAutoSentRef = useRef<boolean>(false);

  // Timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Send OTP handler
  const handleSendOtp = useCallback(async (isResend = false) => {
    setIsSending(true);
    setError(null);
    if (isResend) setSuccessMsg(null);

    try {
      const res = await payrollOtpApi.sendOtp();
      setOtpSent(true);
      setMaskedEmail(res.maskedEmail || user?.email || "your account email");
      setSuccessMsg(isResend ? "A new 6-digit code has been sent to your email." : "Verification code sent to your email.");
      setCooldown(60); // 60 seconds cooldown
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, "Failed to send verification code. Please try again.");
      setError(msg);
    } finally {
      setIsSending(false);
    }
  }, [user]);

  // Initial check on mount
  useEffect(() => {
    let isSubscribed = true;

    const checkStatus = async () => {
      setIsChecking(true);
      const token = typeof window !== "undefined" ? sessionStorage.getItem("payroll_elevated_token") : null;
      if (token) {
        const valid = await payrollOtpApi.checkElevatedStatus();
        if (valid && isSubscribed) {
          setIsUnlocked(true);
          setIsChecking(false);
          return;
        } else {
          sessionStorage.removeItem("payroll_elevated_token");
        }
      }
      if (!isSubscribed) return;
      setIsChecking(false);

      if (!hasAutoSentRef.current) {
        hasAutoSentRef.current = true;
        handleSendOtp();
      }
    };

    checkStatus();

    return () => {
      isSubscribed = false;
    };
  }, [handleSendOtp]);

  // Verify OTP handler
  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsVerifying(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await payrollOtpApi.verifyOtp(fullCode);
      if (res.elevatedToken) {
        sessionStorage.setItem("payroll_elevated_token", res.elevatedToken);
        // Notify sidebar & rest of app
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("payroll-unlocked-changed", { detail: true }));
        }
        setIsUnlocked(true);
      } else {
        setError("Verification succeeded but no access token was issued. Please retry.");
      }
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, "Invalid verification code. Please check and try again.");
      setError(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  // OTP Input handlers
  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digits
    const digit = value.replace(/\D/g, "");
    if (!digit && value !== "") return;

    const newCode = [...code];
    newCode[index] = digit.slice(-1); // Take last entered character
    setCode(newCode);
    setError(null);

    // Auto-advance to next input if digit entered
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newCode = [...code];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || "";
    }
    setCode(newCode);
    setError(null);

    // Focus on input corresponding to pasted length
    const nextIdx = Math.min(pasted.length, 5);
    inputRefs.current[nextIdx]?.focus();
  };

  // Mask fallback format
  const displayEmail = maskedEmail || user?.email || "your registered email";

  if (isChecking) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-white/70">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-white/50">Verifying security access...</p>
      </div>
    );
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#181a26] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Top Glow Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0 blur-xs" />

        {/* Lock Icon Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400 shadow-inner">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Payroll Security Verification</h2>
          <p className="text-xs text-white/60 mt-1.5 leading-relaxed max-w-xs">
            Payroll processing contains confidential compensation data. We&apos;ve sent a 6-digit verification code to:
          </p>
          <div className="mt-2.5 px-3 py-1 bg-white/[0.06] border border-white/10 rounded-full text-xs font-semibold text-amber-300 tracking-wide">
            {displayEmail}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
            <svg className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Success Banner */}
        {successMsg && !error && (
          <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
            <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 font-medium">{successMsg}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-white/50 text-center mb-3">
              Enter 6-digit Security Code
            </label>
            <div className="flex justify-between gap-2 sm:gap-2.5">
              {code.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  className={`
                    w-11 h-13 text-center text-xl font-bold text-white rounded-xl
                    bg-white/[0.04] border transition-all duration-150 outline-none
                    ${digit
                      ? "border-amber-500/60 bg-amber-500/10 text-amber-200 ring-2 ring-amber-500/20"
                      : "border-white/10 hover:border-white/25 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                    }
                  `}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isVerifying || code.join("").length < 6}
            className={`
              w-full py-3 px-4 rounded-xl text-sm font-semibold tracking-wide
              transition-all duration-200 flex items-center justify-center gap-2 shadow-lg
              ${code.join("").length === 6 && !isVerifying
                ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-amber-500/20 active:scale-[0.99]"
                : "bg-white/10 text-white/40 cursor-not-allowed border border-white/5"
              }
            `}
          >
            {isVerifying ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Verifying Code...
              </>
            ) : (
              "Verify & Access Payroll"
            )}
          </button>
        </form>

        {/* Resend Code Section */}
        <div className="mt-6 pt-5 border-t border-white/[0.06] flex items-center justify-between text-xs">
          <span className="text-white/40">Didn&apos;t receive code?</span>
          <button
            type="button"
            onClick={() => handleSendOtp(true)}
            disabled={cooldown > 0 || isSending}
            className={`
              font-semibold transition-colors duration-150 flex items-center gap-1.5
              ${cooldown > 0 || isSending
                ? "text-white/30 cursor-not-allowed"
                : "text-amber-400 hover:text-amber-300 underline underline-offset-4"
              }
            `}
          >
            {isSending ? (
              <>
                <div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                Sending...
              </>
            ) : cooldown > 0 ? (
              `Resend code in ${cooldown}s`
            ) : (
              "Resend Code"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
