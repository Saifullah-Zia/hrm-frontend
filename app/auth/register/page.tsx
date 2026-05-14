"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { registerUser } from "@/services/authService";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import {
  getPasswordStrength,
  strengthBarColor,
  strengthTextColor,
} from "@/lib/passwordStrength";

const inputClass =
  "w-full bg-[#1e2029] border border-white/10 rounded-xl px-4 py-3 text-white/90 text-sm placeholder:text-white/20 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const message = await registerUser({
        name: form.fullName,
        email: form.email,
        password: form.password,
        role: "EMPLOYEE",
      });

      setSuccess(message || "Check your email for the verification code.");
      setTimeout(() => {
        router.push(`/auth/verify-email?email=${encodeURIComponent(form.email)}`);
      }, 1600);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#fc0175]/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-[#16181f] border border-white/[0.07] rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-black ring-1 ring-white/10 overflow-hidden flex items-center justify-center shadow-lg shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/jcat-logo.png" alt="JCAT Solutions HRM" width={40} height={40} className="object-contain p-0.5" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight leading-snug">
            JCAT Solutions <span className="text-indigo-400">HRM</span>
          </span>
        </div>

        <div className="mb-7">
          <h2 className="text-2xl font-bold text-white/90 tracking-tight">Create account</h2>
          <p className="text-white/40 text-sm mt-1">Join your organization on JCAT Solutions HRM</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-white/50 text-xs font-medium">Full name</label>
            <input
              name="fullName"
              type="text"
              required
              autoComplete="name"
              placeholder="John Smith"
              value={form.fullName}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-white/50 text-xs font-medium">Email address</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={handleChange}
              className={inputClass}
              suppressHydrationWarning
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-white/50 text-xs font-medium">Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={handleChange}
                className={`${inputClass} pr-11`}
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
            {form.password.length > 0 && (
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

          <div className="flex flex-col gap-1.5">
            <label className="text-white/50 text-xs font-medium">Confirm password</label>
            <div className="relative">
              <input
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={handleChange}
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
                !
              </span>
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
                ✓
              </span>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center min-h-[46px]"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <p className="text-center text-white/40 text-sm mt-6">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
