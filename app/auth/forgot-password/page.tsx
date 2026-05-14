"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { forgotPassword } from "@/services/authService";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const msg = await forgotPassword(email.trim());
      setSuccess(msg);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Request failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="relative w-full max-w-md bg-[#16181f] border border-white/[0.07] rounded-2xl p-8 shadow-2xl">
        <h1 className="text-xl font-bold text-white/90">Forgot password</h1>
        <p className="text-white/45 text-sm mt-2">
          We&apos;ll email you a one-time code to reset your password.
        </p>

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
            {loading ? "Sending…" : "Send reset code"}
          </button>
        </form>

        {success && (
          <button
            type="button"
            onClick={() => router.push(`/auth/reset-password?email=${encodeURIComponent(email.trim())}`)}
            className="mt-4 w-full py-3 border border-white/15 rounded-xl text-white/90 text-sm font-medium hover:bg-white/5 transition-colors"
          >
            Enter new password
          </button>
        )}

        <p className="text-center text-white/40 text-sm mt-6">
          <Link href="/auth/login" className="text-indigo-400 font-medium hover:text-indigo-300">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
