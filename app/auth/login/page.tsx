"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import styles from "./auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { setToken, getRedirectPath } = useAuthStore();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

      // Set cookie for middleware
      document.cookie = `hrm-token=${token}; path=/; max-age=${7 * 24 * 60 * 60}`;

      router.push(getRedirectPath());
    }  catch (err: any) {
  if (err.response?.status === 401) {
    setError("Invalid email or password.");
  } else if (err.response?.data?.message) {
    setError(err.response.data.message);
  } else if (err.message) {
    setError(err.message);
  } else {
    setError("Something went wrong. Please try again.");
  }
} finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.backdrop} />

      <div className={styles.card}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.logo}>
            <span>H</span>
          </div>
          <h1 className={styles.brandName}>HRM<span>System</span></h1>
        </div>

        {/* Header */}
        <div className={styles.cardHeader}>
          <h2>Welcome back</h2>
          <p>Sign in to your account to continue</p>
        </div>

        {/* Form */}
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
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">
              Password
              <Link href="/forgot-password" className={styles.forgotLink}>
                Forgot password?
              </Link>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          {error && (
            <div className={styles.errorBox}>
              <span className={styles.errorIcon}>!</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? <span className={styles.spinner} /> : "Sign In"}
          </button>
        </form>

        <p className={styles.switchLink}>
          Don&apos;t have an account?{" "}
          <Link href="/auth/register">Create account</Link>
        </p>
      </div>
    </div>
  );
}