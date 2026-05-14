"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { resetPassword } from "@/services/authService";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import {
  getPasswordStrength,
  strengthBarColor,
  strengthTextColor,
} from "@/lib/passwordStrength";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailInitial = searchParams.get("email")?.trim() ?? "";

  const [email, setEmail] = useState(emailInitial);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(newPassword);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const msg = await resetPassword(email.trim(), otp.trim(), newPassword);
      setSuccess(msg);
      setTimeout(() => router.push("/auth/login"), 2000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Reset failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-[#fc0175]/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="relative w-full max-w-md bg-[#16181f] border border-white/[0.07] rounded-2xl p-8 shadow-2xl">
        <h1 className="text-xl font-bold text-white/90">Set a new password</h1>
        <p className="text-white/45 text-sm mt-2">Use the code from your email and choose a new password.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
            <label className="text-white/50 text-xs font-medium">Reset code</label>
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

          <div className="flex flex-col gap-1.5">
            <label className="text-white/50 text-xs font-medium">New password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#1e2029] border border-white/10 rounded-xl px-4 py-3 pr-11 text-white/90 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {newPassword.length > 0 && (
              <div className="mt-1 space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strengthBarColor(strength.label)}`}
                    style={{ width: `${strength.percent}%` }}
                  />
                </div>
                <p className={`text-xs font-medium ${strengthTextColor(strength.label)}`}>
                  Password strength: {strength.label}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>
          )}
          {success && (
            <div className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-all"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>

        <p className="text-center text-white/40 text-sm mt-6">
          <Link href="/auth/login" className="text-indigo-400 font-medium hover:text-indigo-300">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-white/50 text-sm">
          Loading…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
