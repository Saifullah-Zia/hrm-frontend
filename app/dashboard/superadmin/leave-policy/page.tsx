"use client";

import { useEffect, useState } from "react";
import { leavePolicyApi, LeavePolicyDto } from "@/services/leaveApi";

type Toast = { message: string; type: "success" | "error" } | null;

export default function SuperadminLeavePolicyPage() {
  const [policies, setPolicies] = useState<LeavePolicyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [editing, setEditing] = useState<LeavePolicyDto | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await leavePolicyApi.getAll();
      setPolicies(data.sort((a, b) => a.leaveType.localeCompare(b.leaveType)));
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to load policies", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await leavePolicyApi.update(editing.id, {
        totalDaysPerYear: editing.totalDaysPerYear,
        requiresOneYear: editing.requiresOneYear,
        carryForward: editing.carryForward,
        maxCarryForwardDays: editing.maxCarryForwardDays,
        isPublicHoliday: editing.isPublicHoliday,
        applyBeforeDays: editing.applyBeforeDays,
      });
      setPolicies((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditing(null);
      setToast({ message: "Policy updated.", type: "success" });
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Save failed", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] p-6">
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 rounded-xl border px-4 py-3 text-sm shadow-lg ${
            toast.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
              : "border-rose-500/30 bg-rose-500/15 text-rose-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Leave policies</h1>
        <p className="text-white/40 text-sm mt-1">
          Configure and manage company leave policies.
        </p>

        <div className="mt-8 rounded-2xl border border-white/[0.06] bg-[#13151e] overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-white/40 text-sm">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-white/40 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Days / yr</th>
                    <th className="px-4 py-3 font-medium">1 yr rule</th>
                    <th className="px-4 py-3 font-medium">Carry fwd</th>
                    <th className="px-4 py-3 font-medium">Max carry</th>
                    <th className="px-4 py-3 font-medium">Public hol.</th>
                    <th className="px-4 py-3 font-medium">Apply before (d)</th>
                    <th className="px-4 py-3 font-medium"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {policies.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white/80 font-medium">{p.leaveType}</td>
                      <td className="px-4 py-3 text-white/60">{p.totalDaysPerYear}</td>
                      <td className="px-4 py-3 text-white/50">{p.requiresOneYear ? "Yes" : "No"}</td>
                      <td className="px-4 py-3 text-white/50">{p.carryForward ? "Yes" : "No"}</td>
                      <td className="px-4 py-3 text-white/50">{p.maxCarryForwardDays}</td>
                      <td className="px-4 py-3 text-white/50">{p.isPublicHoliday ? "Yes" : "No"}</td>
                      <td className="px-4 py-3 text-white/50">{p.applyBeforeDays ?? "—"}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setEditing({ ...p })}
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#1a1d28] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-white/90">Edit {editing.leaveType}</h2>
            <label className="block text-xs text-white/40 uppercase tracking-wider">Total days per year</label>
            <input
              type="number"
              min={0}
              value={editing.totalDaysPerYear}
              onChange={(e) =>
                setEditing((x) => (x ? { ...x, totalDaysPerYear: Number(e.target.value) } : x))
              }
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 text-sm"
            />
            <div className="flex items-center gap-2">
              <input
                id="ry"
                type="checkbox"
                checked={editing.requiresOneYear}
                onChange={(e) =>
                  setEditing((x) => (x ? { ...x, requiresOneYear: e.target.checked } : x))
                }
                className="rounded border-white/20"
              />
              <label htmlFor="ry" className="text-sm text-white/70">
                Requires one year of service
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="cf"
                type="checkbox"
                checked={editing.carryForward}
                onChange={(e) =>
                  setEditing((x) => (x ? { ...x, carryForward: e.target.checked } : x))
                }
                className="rounded border-white/20"
              />
              <label htmlFor="cf" className="text-sm text-white/70">
                Allow carry forward
              </label>
            </div>
            <label className="block text-xs text-white/40 uppercase tracking-wider">Max carry-forward days</label>
            <input
              type="number"
              min={0}
              value={editing.maxCarryForwardDays}
              onChange={(e) =>
                setEditing((x) => (x ? { ...x, maxCarryForwardDays: Number(e.target.value) } : x))
              }
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 text-sm"
            />
            <div className="flex items-center gap-2">
              <input
                id="ph"
                type="checkbox"
                checked={editing.isPublicHoliday}
                onChange={(e) =>
                  setEditing((x) => (x ? { ...x, isPublicHoliday: e.target.checked } : x))
                }
                className="rounded border-white/20"
              />
              <label htmlFor="ph" className="text-sm text-white/70">
                Public holiday leave (Eid rules)
              </label>
            </div>
            <label className="block text-xs text-white/40 uppercase tracking-wider">
              Apply before (days) — null for non-holiday
            </label>
            <input
              type="number"
              min={0}
              placeholder="empty = null"
              value={editing.applyBeforeDays ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setEditing((x) =>
                  x ? { ...x, applyBeforeDays: v === "" ? null : Number(v) } : x
                );
              }}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 text-sm"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-xl text-sm text-white/60 border border-white/10 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="px-4 py-2 rounded-xl text-sm bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
