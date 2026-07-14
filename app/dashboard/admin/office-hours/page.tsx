"use client";
import { Toast } from "@/app/components/Toast";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { officeHoursApi } from "@/services/officeHoursApi";
import type { OfficeHoursConfig } from "@/lib/officeHours";
import { DEFAULT_OFFICE_HOURS } from "@/lib/officeHours";

export default function AdminOfficeHoursPage() {
  const qc = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [draft, setDraft] = useState<OfficeHoursConfig>(DEFAULT_OFFICE_HOURS);

  const getBoundaryTime = (startStr: string, minutes: number) => {
    if (!startStr) return "";
    const [h, m] = startStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return "";
    const d = new Date(2000, 0, 1, h, m + minutes);
    let hh = d.getHours();
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12;
    hh = hh ? hh : 12;
    const hhStr = String(hh).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hhStr}:${mm} ${ampm}`;
  };

  const formatAmPm = (timeStr: string) => {
    if (!timeStr) return "";
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    const hh = String(h).padStart(2, '0');
    return `${hh}:${mStr} ${ampm}`;
  };

  const query = useQuery({
    queryKey: ["office-hours"],
    queryFn: () => officeHoursApi.get(),
  });

  useEffect(() => {
    if (query.data) setDraft(query.data);
  }, [query.data]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const saveMutation = useMutation({
    mutationFn: () => officeHoursApi.update(draft),
    onSuccess: (config) => {
      qc.setQueryData(["office-hours"], config);
      setToast({
        type: "success",
        message: "Office hours saved to the server. All employees will see these hours.",
      });
    },
    onError: (e) => {
      setToast({
        type: "error",
        message: "Failed to save office hours to the server.",
      });
    }
  });

  return (
    <div className="max-w-xl space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-white/90 tracking-tight">Office hours</h1>
        <p className="text-white/40 text-sm mt-1">
          Set the official start and end of the workday. Check-in after start plus the grace period is marked as LATE; on time is PRESENT.
        </p>
      </div>

      <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Workday start</label>
            <input
              type="time"
              value={draft.workdayStart}
              onChange={(e) => setDraft((d) => ({ ...d, workdayStart: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Workday end</label>
            <input
              type="time"
              value={draft.workdayEnd}
              onChange={(e) => setDraft((d) => ({ ...d, workdayEnd: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Grace period (minutes)</label>
            <input
              type="number"
              min={0}
              max={120}
              value={draft.graceMinutes}
              onChange={(e) =>
                setDraft((d) => ({ ...d, graceMinutes: Math.max(0, parseInt(e.target.value, 10) || 0) }))
              }
              className="mt-1.5 w-full max-w-xs px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90"
            />
            <p className="text-[11px] text-white/35 mt-1">
              Example: start {formatAmPm(draft.workdayStart)} + {draft.graceMinutes} min grace → check-in by {getBoundaryTime(draft.workdayStart, draft.graceMinutes)} is <span className="text-emerald-400/90">PRESENT</span>
              ; {getBoundaryTime(draft.workdayStart, draft.graceMinutes + 1)} is <span className="text-amber-400/90">LATE</span>.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium"
          >
            {saveMutation.isPending ? "Saving…" : "Save office hours"}
          </button>
          <button
            type="button"
            onClick={() => setDraft(query.data ?? DEFAULT_OFFICE_HOURS)}
            className="px-5 py-2.5 rounded-xl border border-white/[0.1] text-white/60 text-sm hover:bg-white/[0.05]"
          >
            Reset to loaded
          </button>
        </div>
      </div>


    </div>
  );
}
