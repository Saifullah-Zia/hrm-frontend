"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useVisibleInterval } from "@/lib/useVisibleInterval";
import { getTokenExpiryMs, isTokenExpired } from "@/lib/jwtExpiry";
import { presenceApi } from "@/services/presenceApi";

const queryClient = new QueryClient();

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, token, logout, getRedirectPath } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Wait for the persisted login (localStorage) to load before deciding anything.
  // Without this, a page refresh briefly looks "logged out" and redirects to login.
 const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const persist = useAuthStore.persist;
    if (!persist) {
      setHydrated(true);
      return;
    }
    if (persist.hasHydrated()) setHydrated(true);
    return persist.onFinishHydration(() => setHydrated(true));
  }, []);

  // Log out only when the token has actually expired (also on a tab left open).
  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    const exp = getTokenExpiryMs(token);
    if (exp === null || isTokenExpired(token)) {
      logout();
      return;
    }
    const t = setTimeout(() => logout(), Math.min(exp - Date.now(), 2_147_000_000));
    return () => clearTimeout(t);
  }, [hydrated, isAuthenticated, token, logout]);

  // Heartbeat once a minute while the tab is visible (drives "Online now")
  useEffect(() => {
    if (hydrated && isAuthenticated) presenceApi.heartbeat().catch(() => {});
  }, [hydrated, isAuthenticated]);
  useVisibleInterval(
    () => { presenceApi.heartbeat().catch(() => {}); },
    60_000,
    hydrated && isAuthenticated
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    // Redirect user to their role-specific dashboard if they land on /dashboard
    if (pathname === "/dashboard") {
      router.replace(getRedirectPath());
    }
  }, [hydrated, isAuthenticated, pathname, router, getRedirectPath]);

  if (!hydrated || !isAuthenticated) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen bg-[#0f1117] overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}