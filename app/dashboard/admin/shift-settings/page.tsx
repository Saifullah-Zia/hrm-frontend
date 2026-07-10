"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { officeHoursApi } from "@/services/officeHoursApi";
import type { OfficeHoursConfig } from "@/lib/officeHours";

export default function ShiftSettingsPage() {
  const qc = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState<OfficeHoursConfig>({
    workdayStart: "17:00",
    workdayEnd: "02:00",
    graceMinutes: 15,
  });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const settingsQuery = useQuery({
    queryKey: ["office-hours"],
    queryFn: () => officeHoursApi.get(),
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setForm(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (config: OfficeHoursConfig) => officeHoursApi.update(config),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["office-hours"] });
      setToast({ message: "Shift settings updated successfully.", type: "success" });
    },
    onError: (err: Error) => {
      setToast({ message: err.message || "Failed to update settings.", type: "error" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.graceMinutes < 0 || form.graceMinutes > 60) {
      setToast({ message: "Grace minutes must be between 0 and 60.", type: "error" });
      return;
    }
    updateMutation.mutate(form);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 max-w-md rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
              : "border-rose-500/30 bg-rose-500/15 text-rose-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white/90 tracking-tight">Shift Settings</h1>
        <p className="text-white/40 text-sm mt-1">Configure work hours and grace period for attendance tracking.</p>
      </div>

      {settingsQuery.isLoading ? (
        <div className="animate-pulse h-48 rounded-2xl bg-white/[0.04]" />
      ) : (
        <div className="bg-[#13151e] border border-white/[0.08] rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Workday Start Time</label>
                <input
                  type="time"
                  value={form.workdayStart}
                  onChange={(e) => setForm({ ...form, workdayStart: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                  required
                />
                <p className="text-white/30 text-xs mt-1">e.g., 17:00 for 5:00 PM</p>
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Workday End Time</label>
                <input
                  type="time"
                  value={form.workdayEnd}
                  onChange={(e) => setForm({ ...form, workdayEnd: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                  required
                />
                <p className="text-white/30 text-xs mt-1">e.g., 02:00 for 2:00 AM (next day)</p>
              </div>
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1.5 block">Grace Period (minutes)</label>
              <input
                type="number"
                min="0"
                max="60"
                value={form.graceMinutes}
                onChange={(e) => setForm({ ...form, graceMinutes: parseInt(e.target.value) || 0 })}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                required
              />
              <p className="text-white/30 text-xs mt-1">Employees arriving within this period after start time are marked PRESENT</p>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-6 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-6">
        <h3 className="text-white/80 font-semibold mb-3">Current Shift Configuration</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/40">Start Time:</span>
            <span className="text-white/80 font-medium">{form.workdayStart}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">End Time:</span>
            <span className="text-white/80 font-medium">{form.workdayEnd}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Grace Period:</span>
            <span className="text-white/80 font-medium">{form.graceMinutes} minutes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
