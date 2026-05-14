import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  role?: string;
  name?: string;
  userId?: number;
  email?: string;
}

function persistSession(
  accessToken: string,
  extras: Partial<Pick<LoginResponse, "role" | "name" | "userId" | "email" | "refreshToken">> & {
    emailFallback?: string;
  }
) {
  localStorage.setItem("token", accessToken);
  if (extras.refreshToken) {
    localStorage.setItem("refreshToken", extras.refreshToken);
  } else {
    localStorage.removeItem("refreshToken");
  }

  const authStoreData = {
    state: {
      token: accessToken,
      user: {
        username: extras.name || extras.emailFallback || "",
        role: extras.role || "EMPLOYEE",
        userId: extras.userId,
        email: extras.email || extras.emailFallback,
        token: accessToken,
      },
      isAuthenticated: true,
    },
    version: 0,
  };
  localStorage.setItem("hrm-auth", JSON.stringify(authStoreData));
}

export async function loginUser(credentials: {
  email: string;
  password: string;
}): Promise<string> {
  const response = await api.post<LoginResponse>("/api/auth/login", credentials);
  const token = response.data.accessToken;

  persistSession(token, {
    refreshToken: response.data.refreshToken,
    role: response.data.role,
    name: response.data.name,
    userId: response.data.userId,
    email: response.data.email,
    emailFallback: credentials.email,
  });

  return token;
}

/** Backend returns a plain text message (no JWT until email is verified). */
export async function registerUser(data: {
  email: string;
  password: string;
  name?: string;
  role?: string;
}): Promise<string> {
  const response = await api.post<string>("/api/auth/register", data, {
    // Spring may respond with text/plain; axios still puts body in data
    transformResponse: [(raw) => {
      if (typeof raw !== "string") return raw;
      const t = raw.trim();
      if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
        try {
          return JSON.parse(t);
        } catch {
          return raw;
        }
      }
      return raw;
    }],
  });

  const body = response.data;
  if (typeof body === "string") return body;
  if (body && typeof body === "object" && "message" in body) {
    return String((body as { message: unknown }).message ?? "");
  }
  return String(body ?? "");
}

export async function verifyEmail(email: string, otp: string): Promise<string> {
  const { data } = await api.post<string>("/api/auth/verify-email", null, {
    params: { email, otp },
    transformResponse: [(raw) => {
      if (typeof raw !== "string") return raw;
      const t = raw.trim();
      if (t.startsWith("{") && t.endsWith("}")) {
        try {
          return JSON.parse(t);
        } catch {
          return raw;
        }
      }
      return raw;
    }],
  });
  return typeof data === "string" ? data : String((data as { message?: string })?.message ?? data);
}

export async function resendVerificationOtp(email: string): Promise<string> {
  const { data } = await api.post<string>("/api/auth/resend-otp", null, {
    params: { email },
    transformResponse: [(raw) => {
      if (typeof raw !== "string") return raw;
      const t = raw.trim();
      if (t.startsWith("{") && t.endsWith("}")) {
        try {
          return JSON.parse(t);
        } catch {
          return raw;
        }
      }
      return raw;
    }],
  });
  return typeof data === "string" ? data : String((data as { message?: string })?.message ?? data);
}

export async function forgotPassword(email: string): Promise<string> {
  const { data } = await api.post<string>("/api/auth/forgot-password", null, {
    params: { email },
    transformResponse: [(raw) => {
      if (typeof raw !== "string") return raw;
      const t = raw.trim();
      if (t.startsWith("{") && t.endsWith("}")) {
        try {
          return JSON.parse(t);
        } catch {
          return raw;
        }
      }
      return raw;
    }],
  });
  return typeof data === "string" ? data : String((data as { message?: string })?.message ?? data);
}

export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string
): Promise<string> {
  const { data } = await api.post<string>("/api/auth/reset-password", null, {
    params: { email, otp, newPassword },
    transformResponse: [(raw) => {
      if (typeof raw !== "string") return raw;
      const t = raw.trim();
      if (t.startsWith("{") && t.endsWith("}")) {
        try {
          return JSON.parse(t);
        } catch {
          return raw;
        }
      }
      return raw;
    }],
  });
  return typeof data === "string" ? data : String((data as { message?: string })?.message ?? data);
}

export async function logoutUser(): Promise<void> {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  await api.post("/api/auth/logout").catch(() => {});
}
