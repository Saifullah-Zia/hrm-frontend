"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import apiClient from "@/lib/apiClient";
import { Toast } from "@/app/components/Toast";

type ToastState = { message: string; type: "success" | "error" | "info" } | null;

export default function SettingsPage() {
  const { user, updateProfileState } = useAuthStore();
  const userId = user?.userId;

  // Profile Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Password Form States
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // General Toast State
  const [toast, setToast] = useState<ToastState>(null);

  // Initialize values from auth store
  useEffect(() => {
    if (user) {
      setName(user.username || "");
      setEmail(user.email || "");
    }
  }, [user]);

  // Hide toast automatically
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setToast({ message: "Name and email are required.", type: "error" });
      return;
    }

    setProfileLoading(true);
    try {
      const res = await apiClient.put(`/api/users/${userId}/update-profile`, {
        name: name.trim(),
        email: email.trim(),
      });

      // Update state in Zustant store
      updateProfileState(res.data.name, res.data.email);
      setToast({ message: "Profile updated successfully!", type: "success" });
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Failed to update profile.";
      setToast({ message: errMsg, type: "error" });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      setToast({ message: "All password fields are required.", type: "error" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setToast({ message: "New passwords do not match.", type: "error" });
      return;
    }

    if (newPassword.length < 6) {
      setToast({ message: "Password must be at least 6 characters long.", type: "error" });
      return;
    }

    setPasswordLoading(true);
    try {
      await apiClient.put(`/api/users/${userId}/change-password`, {
        oldPassword,
        newPassword,
      });

      setToast({ message: "Password changed successfully!", type: "success" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Failed to change password.";
      setToast({ message: errMsg, type: "error" });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!userId) {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
        Session info missing. Please try logging in again.
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white/90 tracking-tight">Settings</h1>
        <p className="text-white/40 text-sm mt-1">Manage your account credentials and personal preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Settings Card */}
        <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-white/80">Personal Information</h2>
              <p className="text-white/35 text-xs mt-0.5">Update your display name and email address</p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {profileLoading ? "Updating..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-white/80">Security Settings</h2>
              <p className="text-white/35 text-xs mt-0.5">Update your account login password</p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-1.5">Current Password</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {passwordLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
