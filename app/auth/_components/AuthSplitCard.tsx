"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, User, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { loginUser, registerUser } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import {
  getPasswordStrength,
  strengthBarColor,
  strengthTextColor,
} from "@/lib/passwordStrength";
import { BRAND_LOGO_PATH, BRAND_FULL_NAME } from "@/lib/branding";

interface AuthSplitCardProps {
  initialMode?: "login" | "register";
}

export default function AuthSplitCard({ initialMode = "login" }: AuthSplitCardProps) {
  const router = useRouter();
  const { setToken, getRedirectPath } = useAuthStore();

  const [isRegisterMode, setIsRegisterMode] = useState(initialMode === "register");

  // Login form state
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  const passwordStrength = useMemo(
    () => getPasswordStrength(registerForm.password),
    [registerForm.password]
  );

  const toggleMode = (targetRegister: boolean) => {
    setIsRegisterMode(targetRegister);
    setLoginError(null);
    setRegisterError(null);
    setRegisterSuccess(null);
    if (targetRegister) {
      router.replace("/auth/register");
    } else {
      router.replace("/auth/login");
    }
  };

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const session = await loginUser({
        email: loginForm.email,
        password: loginForm.password,
      });

      setToken(session.token, {
        userId: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
      });

      document.cookie = `hrm-token=${session.token}; path=/; max-age=${7 * 24 * 60 * 60}`;
      router.push(getRedirectPath());
    } catch (err: unknown) {
      setLoginError(getApiErrorMessage(err, "Invalid email or password. Please try again."));
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);

    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError("Passwords do not match.");
      return;
    }

    if (registerForm.password.length < 8) {
      setRegisterError("Password must be at least 8 characters long.");
      return;
    }

    setRegisterLoading(true);

    try {
      const message = await registerUser({
        name: registerForm.fullName,
        email: registerForm.email,
        password: registerForm.password,
        role: "EMPLOYEE",
      });

      setRegisterSuccess(message || "Registration successful! Please verify your email.");
      setTimeout(() => {
        router.push(`/auth/verify-email?email=${encodeURIComponent(registerForm.email)}`);
      }, 1600);
    } catch (err: unknown) {
      setRegisterError(getApiErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b10] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Dynamic Background Glowing Orbs using JCAT Logo Colors */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#fc0175]/15 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#6366f1]/15 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDelay: "2s" }} />
      <div className="absolute top-[40%] right-[30%] w-[300px] h-[300px] bg-[#a855f7]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-4xl bg-[#11131c]/90 border border-white/[0.08] rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl overflow-hidden min-h-[640px]">
        
        {/* Mobile View Toggle Pills (< lg screens) */}
        <div className="lg:hidden p-4 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex bg-[#1a1d2b] p-1 rounded-2xl border border-white/[0.06]">
            <button
              onClick={() => toggleMode(false)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                !isRegisterMode
                  ? "bg-gradient-to-r from-[#fc0175] to-[#6366f1] text-white shadow-lg"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => toggleMode(true)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isRegisterMode
                  ? "bg-gradient-to-r from-[#fc0175] to-[#6366f1] text-white shadow-lg"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Desktop Split Layout (lg+ screens) */}
        <div className="relative w-full min-h-[640px] flex">
          
          {/* Left Section: Sign In Form */}
          <div
            className={`w-full lg:w-1/2 p-8 sm:p-10 lg:p-12 flex flex-col justify-between transition-all duration-700 ${
              isRegisterMode && "lg:opacity-0 lg:pointer-events-none"
            } ${!isRegisterMode ? "block" : "hidden lg:flex"}`}
          >
            <div>
              {/* Brand Header */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-black/60 ring-1 ring-white/15 p-1 flex items-center justify-center shadow-md shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={BRAND_LOGO_PATH} alt={BRAND_FULL_NAME} className="w-full h-full object-contain" />
                </div>
                <span className="text-white font-bold text-lg tracking-tight">
                  JCAT Solutions <span className="text-[#fc0175]">HRM</span>
                </span>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Welcome Back</h2>
                <p className="text-white/40 text-xs sm:text-sm mt-1.5">
                  Sign in with your credentials to access your dashboard.
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-white/60 text-xs font-medium">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                    <input
                      type="email"
                      required
                      placeholder="you@company.com"
                      value={loginForm.email}
                      onChange={(e) => {
                        setLoginForm({ ...loginForm, email: e.target.value });
                        setLoginError(null);
                      }}
                      className="w-full bg-[#181a26] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-white/20 outline-none focus:border-[#fc0175]/60 focus:ring-2 focus:ring-[#fc0175]/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-white/60 text-xs font-medium">Password</label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs text-[#fc0175] hover:text-[#ff4097] transition-colors font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => {
                        setLoginForm({ ...loginForm, password: e.target.value });
                        setLoginError(null);
                      }}
                      className="w-full bg-[#181a26] border border-white/[0.08] rounded-xl pl-10 pr-10 py-3 text-white text-sm placeholder:text-white/20 outline-none focus:border-[#fc0175]/60 focus:ring-2 focus:ring-[#fc0175]/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 p-1"
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs p-3 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full mt-3 py-3 px-4 bg-gradient-to-r from-[#fc0175] via-[#b5179e] to-[#6366f1] hover:opacity-95 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-[#fc0175]/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loginLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="pt-6 border-t border-white/[0.06] text-center lg:hidden">
              <p className="text-white/40 text-xs">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => toggleMode(true)}
                  className="text-[#fc0175] font-semibold hover:underline"
                >
                  Create account
                </button>
              </p>
            </div>
          </div>

          {/* Right Section: Sign Up Form */}
          <div
            className={`w-full lg:w-1/2 p-8 sm:p-10 lg:p-12 flex flex-col justify-between transition-all duration-700 ${
              !isRegisterMode && "lg:opacity-0 lg:pointer-events-none"
            } ${isRegisterMode ? "block" : "hidden lg:flex"}`}
          >
            <div>
              {/* Brand Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-black/60 ring-1 ring-white/15 p-1 flex items-center justify-center shadow-md shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={BRAND_LOGO_PATH} alt={BRAND_FULL_NAME} className="w-full h-full object-contain" />
                </div>
                <span className="text-white font-bold text-lg tracking-tight">
                  JCAT Solutions <span className="text-[#fc0175]">HRM</span>
                </span>
              </div>

              <div className="mb-5">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Create Account</h2>
                <p className="text-white/40 text-xs sm:text-sm mt-1">
                  Join your team on JCAT Solutions HRM.
                </p>
              </div>

              {/* Register Form */}
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-white/60 text-xs font-medium">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                    <input
                      type="text"
                      required
                      placeholder="John Smith"
                      value={registerForm.fullName}
                      onChange={(e) => {
                        setRegisterForm({ ...registerForm, fullName: e.target.value });
                        setRegisterError(null);
                      }}
                      className="w-full bg-[#181a26] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-white/20 outline-none focus:border-[#fc0175]/60 focus:ring-2 focus:ring-[#fc0175]/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-white/60 text-xs font-medium">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                    <input
                      type="email"
                      required
                      placeholder="you@company.com"
                      value={registerForm.email}
                      onChange={(e) => {
                        setRegisterForm({ ...registerForm, email: e.target.value });
                        setRegisterError(null);
                      }}
                      className="w-full bg-[#181a26] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-white/20 outline-none focus:border-[#fc0175]/60 focus:ring-2 focus:ring-[#fc0175]/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-white/60 text-xs font-medium">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                    <input
                      type={showRegPassword ? "text" : "password"}
                      required
                      placeholder="Min. 8 characters"
                      value={registerForm.password}
                      onChange={(e) => {
                        setRegisterForm({ ...registerForm, password: e.target.value });
                        setRegisterError(null);
                      }}
                      className="w-full bg-[#181a26] border border-white/[0.08] rounded-xl pl-10 pr-10 py-2.5 text-white text-sm placeholder:text-white/20 outline-none focus:border-[#fc0175]/60 focus:ring-2 focus:ring-[#fc0175]/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 p-1"
                    >
                      {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {registerForm.password.length > 0 && (
                    <div className="mt-1 space-y-1">
                      <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${strengthBarColor(passwordStrength.label)}`}
                          style={{ width: `${passwordStrength.percent}%` }}
                        />
                      </div>
                      <p className={`text-[11px] font-medium ${strengthTextColor(passwordStrength.label)}`}>
                        Strength: {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-white/60 text-xs font-medium">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                    <input
                      type={showRegConfirm ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={registerForm.confirmPassword}
                      onChange={(e) => {
                        setRegisterForm({ ...registerForm, confirmPassword: e.target.value });
                        setRegisterError(null);
                      }}
                      className="w-full bg-[#181a26] border border-white/[0.08] rounded-xl pl-10 pr-10 py-2.5 text-white text-sm placeholder:text-white/20 outline-none focus:border-[#fc0175]/60 focus:ring-2 focus:ring-[#fc0175]/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 p-1"
                    >
                      {showRegConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {registerError && (
                  <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs p-2.5 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{registerError}</span>
                  </div>
                )}

                {registerSuccess && (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs p-2.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{registerSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={registerLoading}
                  className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-[#fc0175] via-[#b5179e] to-[#6366f1] hover:opacity-95 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-[#fc0175]/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {registerLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Register Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="pt-4 border-t border-white/[0.06] text-center lg:hidden">
              <p className="text-white/40 text-xs">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => toggleMode(false)}
                  className="text-[#fc0175] font-semibold hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>

          {/* Desktop Animated Sliding Overlay Panel (lg+ screens) */}
          <div
            className={`hidden lg:block absolute top-0 bottom-0 w-1/2 z-30 transition-transform duration-700 cubic-bezier(0.65, 0, 0.35, 1) ${
              isRegisterMode ? "translate-x-0 left-0" : "translate-x-full left-0"
            }`}
          >
            <div className="relative w-full h-full bg-gradient-to-br from-[#fc0175] via-[#7c3aed] to-[#4f46e5] p-12 flex flex-col justify-between items-center text-center shadow-2xl overflow-hidden">
              
              {/* Decorative Animated Elements */}
              <div className="absolute top-[-20%] right-[-20%] w-[350px] h-[350px] bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-[-20%] left-[-20%] w-[350px] h-[350px] bg-black/20 rounded-full blur-2xl pointer-events-none" />

              {/* Branding Top */}
              <div className="relative z-10 flex flex-col items-center gap-3 pt-6">
                <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 p-2.5 flex items-center justify-center shadow-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={BRAND_LOGO_PATH} alt={BRAND_FULL_NAME} className="w-full h-full object-contain drop-shadow-md" />
                </div>
                <h3 className="text-white font-extrabold text-xl tracking-tight drop-shadow-sm">
                  {BRAND_FULL_NAME}
                </h3>
              </div>

              {/* Dynamic Sliding Text & Action */}
              <div className="relative z-10 my-auto max-w-sm space-y-4">
                {isRegisterMode ? (
                  <>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight leading-snug">
                      Already Registered?
                    </h2>
                    <p className="text-white/80 text-sm leading-relaxed">
                      To keep connected with your organization, please log in with your existing account.
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleMode(false)}
                      className="mt-6 px-8 py-3 bg-white/15 hover:bg-white/25 text-white font-bold text-sm rounded-xl border border-white/30 backdrop-blur-md transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      SIGN IN
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight leading-snug">
                      Hello, Colleague!
                    </h2>
                    <p className="text-white/80 text-sm leading-relaxed">
                      Enter your personal details and start your workspace journey with us today.
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleMode(true)}
                      className="mt-6 px-8 py-3 bg-white/15 hover:bg-white/25 text-white font-bold text-sm rounded-xl border border-white/30 backdrop-blur-md transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      SIGN UP
                    </button>
                  </>
                )}
              </div>

              {/* Footer text */}
              <div className="relative z-10 text-white/50 text-xs font-medium">
                © {new Date().getFullYear()} JCAT Solutions HRM. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
