"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Pencil } from "lucide-react";
import { leaveApi, LeaveBalanceDto } from "@/services/leaveApi";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

type Toast = { message: string; type: "success" | "error" } | null;

type EditForm = {
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  carryForwardDays: number;
};

function toEditForm(row: LeaveBalanceDto): EditForm {
  return {
    totalDays: row.totalDays,
    usedDays: row.usedDays,
    pendingDays: row.pendingDays ?? 0,
    carryForwardDays: row.carryForwardDays ?? 0,
  };
}

function remainingFromForm(form: EditForm): number {
  return form.totalDays - form.usedDays - form.pendingDays;
}

export default function AdminLeaveBalancesPage() {
  const [allRows, setAllRows] = useState<LeaveBalanceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<number>(10);
  const [toast, setToast] = useState<Toast>(null);
  const [editing, setEditing] = useState<LeaveBalanceDto | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const balances = await leaveApi.getAllBalances();
      setAllRows(Array.isArray(balances) ? balances : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load balances");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [size, q]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return allRows;
    return allRows.filter(
      (r) =>
        (r.userName ?? "").toLowerCase().includes(s) ||
        (r.leaveType ?? "").toLowerCase().includes(s) ||
        String(r.userId ?? "").includes(s)
    );
  }, [allRows, q]);

  const totalElements = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const pageSlice = useMemo(() => {
    const start = page * size;
    return filtered.slice(start, start + size);
  }, [filtered, page, size]);

  const pageHuman = totalElements === 0 ? 0 : page + 1;
  const isFirst = page <= 0;
  const isLast = totalPages <= 0 ? true : page >= totalPages - 1;

  const openEdit = (row: LeaveBalanceDto) => {
    if (row.id == null) {
      setToast({ message: "This balance row has no id and cannot be edited.", type: "error" });
      return;
    }
    setEditing(row);
    setEditForm(toEditForm(row));
  };

  const closeEdit = () => {
    if (saving) return;
    setEditing(null);
    setEditForm(null);
  };

  const saveEdit = async () => {
    if (!editing?.id || !editForm) return;
    setSaving(true);
    try {
      const updated = await leaveApi.updateBalance(editing.id, {
        totalDays: editForm.totalDays,
        usedDays: editForm.usedDays,
        pendingDays: editForm.pendingDays,
        carryForwardDays: editForm.carryForwardDays,
      });
      setAllRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setEditing(null);
      setEditForm(null);
      setToast({ message: "Leave balance updated.", type: "success" });
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Save failed", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const previewRemaining = editForm ? remainingFromForm(editForm) : 0;

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

      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Leave balances</h1>
        <p className="text-white/40 text-sm mt-1">
          Current year leave balances of all employees. Click edit to adjust totals or usage.
        </p>

        <div className="mt-6 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between flex-wrap">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by employee, type, or user id…"
            className="w-full lg:max-w-md px-4 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-white/40 text-xs">
              Per page
              <select
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="bg-[#13151e] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white/80 text-sm"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#13151e] overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-white/40 text-sm">Loading…</div>
          ) : error ? (
            <div className="p-6 text-rose-400 text-sm">{error}</div>
          ) : pageSlice.length === 0 ? (
            <div className="py-16 text-center text-white/40 text-sm">No balance rows found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-white/40 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Year</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Used</th>
                    <th className="px-4 py-3 font-medium">Pending</th>
                    <th className="px-4 py-3 font-medium">Remaining</th>
                    <th className="px-4 py-3 font-medium">Carry fwd</th>
                    <th className="px-4 py-3 font-medium sticky right-0 bg-[#13151e] z-10">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {pageSlice.map((r) => (
                    <tr key={r.id ?? `${r.userId}-${r.leaveType}-${r.year}`} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white/80">
                        <span className="font-medium">{r.userName ?? "—"}</span>
                        <span className="block text-[11px] text-white/35">ID {r.userId ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-white/70">{r.leaveType}</td>
                      <td className="px-4 py-3 text-white/50">{r.year ?? "—"}</td>
                      <td className="px-4 py-3 text-white/60">{r.totalDays}</td>
                      <td className="px-4 py-3 text-white/60">{r.usedDays}</td>
                      <td className="px-4 py-3 text-white/60">{r.pendingDays ?? 0}</td>
                      <td className="px-4 py-3 text-emerald-400/90 font-medium">{r.remainingDays}</td>
                      <td className="px-4 py-3 text-white/50">{r.carryForwardDays ?? 0}</td>
                      <td className="px-4 py-3 sticky right-0 bg-[#13151e] z-10">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          disabled={r.id == null}
                          title={r.id == null ? "No balance id" : "Edit balance"}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#FC0175] border border-[#FC0175]/30 hover:bg-[#FC0175]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && totalElements > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-white/[0.06] text-white/35 text-xs">
              <span>
                Showing <span className="text-white/60">{pageSlice.length}</span> rows ·{" "}
                <span className="text-white/60">{totalElements} total</span> · Page{" "}
                <span className="text-white/60">{pageHuman}</span> of{" "}
                <span className="text-white/60">{totalPages}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isFirst}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-white/[0.1] text-white/70 text-xs font-medium hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={isLast}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-white/[0.1] text-white/70 text-xs font-medium hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {editing && editForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#1a1d28] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-white/90">Edit leave balance</h2>
            <p className="text-sm text-white/45">
              {editing.userName ?? "Employee"} · {editing.leaveType} · {editing.year ?? "—"}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["totalDays", "Total days"],
                  ["usedDays", "Used days"],
                  ["pendingDays", "Pending days"],
                  ["carryForwardDays", "Carry forward"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-1">{label}</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm[key]}
                    onChange={(e) =>
                      setEditForm((f) => (f ? { ...f, [key]: Math.max(0, Number(e.target.value) || 0) } : f))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 text-sm"
                  />
                </div>
              ))}
            </div>

            <p className="text-sm text-emerald-400/90">
              Remaining (preview): <span className="font-medium">{previewRemaining}</span>
            </p>
            {previewRemaining < 0 && (
              <p className="text-sm text-rose-400">Used + pending cannot exceed total days.</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white/90 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={saving || previewRemaining < 0}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
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
