import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  timeout: 45000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Same sources as `apiFetch` in superadmin User Management: plain `token` key, then Zustand
 * persist `hrm-auth` → `state.token`. If only one is set, axios must still authenticate.
 */
function getStoredJwt() {
  if (typeof window === "undefined") return null;
  const direct = localStorage.getItem("token");
  if (direct) return direct;
  try {
    const raw = localStorage.getItem("hrm-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

// ── Request interceptor: attach JWT & Payroll Elevated Token ──
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = getStoredJwt();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const payrollElevatedToken = sessionStorage.getItem("payroll_elevated_token");
      if (payrollElevatedToken) {
        config.headers["X-Payroll-Elevated-Token"] = payrollElevatedToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle auth errors ─────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth/login")) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");
        localStorage.removeItem("hrm-auth");
        window.location.href = "/auth/login";
      }
    }

    if (status === 403) {
      console.warn("[apiClient] 403 Forbidden — insufficient role.");
    }

    if (status === 400) {
      console.error("[apiClient] 400 Bad Request payload:", error.response?.data);
    }

    return Promise.reject(error);
  }
);

export default apiClient;