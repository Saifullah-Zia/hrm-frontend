// lib/useAuth.js
// ─────────────────────────────────────────────
// Lightweight auth hook — reads JWT from localStorage,
// decodes the role, and exposes a logout helper.
// No external library needed (pure base64 decode).
// ─────────────────────────────────────────────

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Decode a JWT payload without verifying the signature.
 * Verification is done server-side by Spring Boot.
 */
function decodeJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState(null);   // { email, role, ...claims }
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("token");
    if (stored) {
      const payload = decodeJwt(stored);
      // Check expiry
      if (payload && payload.exp * 1000 > Date.now()) {
        setToken(stored);
        setUser(payload);
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
      }
    }
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setToken(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  return { user, token, loading, logout };
}