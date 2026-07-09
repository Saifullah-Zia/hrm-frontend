"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: number;
  userId: number;  // raw JWT claim
  email: string;
  role: string;
  exp: number;
  sub: string;     // username / subject
  [key: string]: unknown;
}

function decodeJwt(token: string): AuthUser | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(json) as Record<string, unknown>;
    // Backend JWT uses claim key "userId" (Long) — map it to "id" for convenience
    const userId = Number(payload["userId"] ?? payload["id"] ?? 0);
    return {
      ...payload,
      id: userId,
      userId,
    } as AuthUser;
  } catch {
    return null;
  }
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("token");
    if (stored) {
      const payload = decodeJwt(stored);
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


