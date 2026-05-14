"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { loginUser } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import styles from "./auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { setToken, getRedirectPath } = useAuthStore();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = await loginUser({
        email: form.email,
        password: form.password,
      });

      setToken(token);

      document.cookie = `hrm-token=${token}; path=/; max-age=${7 * 24 * 60 * 60}`;

      router.push(getRedirectPath());
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.backdrop} />

      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <img src="/jcat-logo.png" alt="JCAT Solutions HRM" width={38} height={38} />
          </div>
          <h1 className={styles.brandName}>
            JCAT Solutions <span>HRM</span>
          </h1>
        </div>

        <div className={styles.cardHeader}>
          <h2>Welcome back</h2>
          <p>Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              value={form.email}
              onChange={handleChange}
              suppressHydrationWarning
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">
              Password
              <Link href="/auth/forgot-password" className={styles.forgotLink}>
                Forgot password?
              </Link>
            </label>
            <div className={styles.passwordWrap}>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.errorBox}>
              <span className={styles.errorIcon}>!</span>
              {error}
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : "Sign In"}
          </button>
        </form>

        <p className={styles.switchLink}>
          Don&apos;t have an account? <Link href="/auth/register">Create account</Link>
        </p>
      </div>
    </div>
  );
}
