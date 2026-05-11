import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
});

interface AuthResponse {
  message?: string;
  accessToken: string;   // ✅ was "token" — backend sends "accessToken"
  refreshToken?: string;
  role?: string;
  name?: string;
  userId?: number;
  email?: string;
}

export async function loginUser(credentials: {
  email: string;
  password: string;
}): Promise<string> {
  const response = await api.post<AuthResponse>("/api/auth/login", credentials);
  const token = response.data.accessToken;
  
  // Store in both places for compatibility
  localStorage.setItem("token", token);
  
  // Also store in zustand format (if you want to use useAuthStore)
  const authStoreData = {
    state: {
      token: token,
      user: {
        username: response.data.name || credentials.email,
        role: response.data.role || "EMPLOYEE",
        userId: response.data.userId,
        email: response.data.email || credentials.email,
        token: token
      },
      isAuthenticated: true
    },
    version: 0
  };
  localStorage.setItem("hrm-auth", JSON.stringify(authStoreData));
  
  return token;
}

export async function registerUser(data: {
  email: string;
  password: string;
  name?: string;
  role?: string;
}): Promise<{ message: string; accessToken: string }> {
  const response = await api.post<AuthResponse>("/api/auth/register", data);
  const token = response.data.accessToken; // ✅ fixed field name
  if (token) localStorage.setItem("token", token);
  return { message: response.data.message ?? "", accessToken: token };
}

export async function logoutUser(): Promise<void> {
  localStorage.removeItem("token");
  await api.post("/api/auth/logout").catch(() => {});
}