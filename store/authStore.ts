"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type UserRole = "SUPERADMIN" | "ADMIN" | "EMPLOYEE";

interface AuthUser {
  username: string;
  role: UserRole;
  userId?: number;
  email?: string;
  token: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  logout: () => void;
  getRedirectPath: () => string;
}

function decodeJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

    const jsonStr = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );

    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("[authStore] Failed to decode JWT:", e);
    return null;
  }
}

function getDashboardRoute(role: UserRole): string {
  switch (role) {
    case "SUPERADMIN": return "/dashboard/superadmin";
    case "ADMIN":      return "/dashboard/admin";
    case "EMPLOYEE":   return "/dashboard/employee";
    default:           return "/dashboard";
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setToken: (token: string) => {
        const payload = decodeJwt(token);
        if (!payload) {
          console.error("[authStore] setToken: invalid or undecodable token.");
          return;
        }

        // ✅ Normalize role to uppercase to ensure consistency
        let role = (payload.role as string)?.toUpperCase();
        
        // ✅ Map role to valid UserRole type
        let userRole: UserRole = "EMPLOYEE";
        if (role === "SUPERADMIN" || role === "SUPER_ADMIN") {
          userRole = "SUPERADMIN";
        } else if (role === "ADMIN") {
          userRole = "ADMIN";
        } else {
          userRole = "EMPLOYEE";
        }

        console.log("[authStore] JWT payload role:", payload.role, "Normalized role:", userRole);

        const user: AuthUser = {
          username: payload.name ?? payload.sub,
          role: userRole,
          userId: payload.userId,
          email: payload.email ?? payload.sub,
          token,
        };

        localStorage.setItem("token", token);
        localStorage.setItem("role", user.role);

        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        set({ token: null, user: null, isAuthenticated: false });
      },

      getRedirectPath: () => {
        const { user } = get();
        if (!user) return "/auth/login";
        return getDashboardRoute(user.role);
      },
    }),
    {
      name: "hrm-auth",
      storage: createJSONStorage(() => localStorage),
    }
  )
);