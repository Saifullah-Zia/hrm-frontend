import apiClient from "@/lib/apiClient";

export interface SendOtpResponse {
  success: boolean;
  message: string;
  maskedEmail?: string;
  expiresInMinutes?: number;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  elevatedToken?: string;
  expiresInMinutes?: number;
}

export interface CheckElevatedResponse {
  valid: boolean;
}

export const payrollOtpApi = {
  sendOtp: async (): Promise<SendOtpResponse> => {
    const res = await apiClient.post<SendOtpResponse>("/api/auth/payroll-otp/send");
    return res.data;
  },

  verifyOtp: async (code: string): Promise<VerifyOtpResponse> => {
    const res = await apiClient.post<VerifyOtpResponse>("/api/auth/payroll-otp/verify", { code });
    return res.data;
  },

  checkElevatedStatus: async (): Promise<boolean> => {
    try {
      const res = await apiClient.get<CheckElevatedResponse>("/api/auth/payroll-otp/check-elevated");
      return res.data?.valid ?? false;
    } catch {
      return false;
    }
  },
};
