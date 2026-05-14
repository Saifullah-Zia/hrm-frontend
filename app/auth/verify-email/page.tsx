"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resendVerificationOtp, verifyEmail } from "@/services/authService";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email")?.trim() ?? "";

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!otp.trim()) {
      setError("Enter the verification code from your email.");
      return;
    }

    setLoading(true);
    try {
      const msg = await verifyEmail(email.trim(), otp.trim());
      setInfo(msg);
      setTimeout(() => router.push("/auth/login"), 2000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Verification failed."));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Enter your email to resend the code.");
      return;
    }
    setResendLoading(true);
    try {
      const msg = await resendVerificationOtp(email.trim());
      setInfo(msg);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Could not resend code."));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="relative w-full max-w-md bg-[#16181f] border border-white/[0.07] rounded-2xl p-8 shadow-2xl">
        <h1 className="text-xl font-bold text-white/90">Verify your email</h1>
        <p className="text-white/45 text-sm mt-2">
          Enter the 6-digit code we sent to your inbox. You must verify before you can sign in.
        </p>

        <form onSubmit={onVerify} className="mt-6 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-white/50 text-xs font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#1e2029] border border-white/10 rounded-xl px-4 py-3 text-white/90 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              autoComplete="email"
              suppressHydrationWarning
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-white/50 text-xs font-medium">Verification code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="bg-[#1e2029] border border-white/10 rounded-xl px-4 py-3 text-white/90 text-sm tracking-widest outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>
          )}
          {info && (
            <div className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-all"
          >
            {loading ? "Verifying…" : "Verify & continue"}
          </button>
        </form>

        <button
          type="button"
          onClick={onResend}
          disabled={resendLoading}
          className="mt-4 w-full text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
        >
          {resendLoading ? "Sending…" : "Resend code"}
        </button>

        <p className="text-center text-white/40 text-sm mt-6">
          <Link href="/auth/login" className="text-indigo-400 font-medium hover:text-indigo-300">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-white/50 text-sm">
          Loading…
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
