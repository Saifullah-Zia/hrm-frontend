"use client";
import { Toast } from "@/app/components/Toast";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { holidayApi, HolidayDto } from "@/services/holidayApi";

const fmtDate = (d: string) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function HolidaysPage() {
  const qc = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    date: new Date().toISOString().split("T")[0],
    isRecurring: false,
    isActive: true,
  });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const holidaysQuery = useQuery({
    queryKey: ["holidays"],
    queryFn: () => holidayApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (dto: HolidayDto) => holidayApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      setToast({ message: "Holiday created successfully.", type: "success" });
      setShowForm(false);
      resetForm();
    },
    onError: (err: Error) => {
      setToast({ message: err.message || "Failed to create holiday.", type: "error" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: HolidayDto }) => holidayApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      setToast({ message: "Holiday updated successfully.", type: "success" });
      setShowForm(false);
      setEditingId(null);
      resetForm();
    },
    onError: (err: Error) => {
      setToast({ message: err.message || "Failed to update holiday.", type: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => holidayApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      setToast({ message: "Holiday deleted successfully.", type: "success" });
    },
    onError: (err: Error) => {
      setToast({ message: err.message || "Failed to delete holiday.", type: "error" });
    },
  });

  const resetForm = () => {
    setForm({
      name: "",
      date: new Date().toISOString().split("T")[0],
      isRecurring: false,
      isActive: true,
    });
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.date) {
      setToast({ message: "Name and date are required.", type: "error" });
      return;
    }
    
    const dto: HolidayDto = {
      name: form.name,
      date: form.date,
      isRecurring: form.isRecurring,
      isActive: form.isActive,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, dto });
    } else {
      createMutation.mutate(dto);
    }
  };

  const handleEdit = (holiday: HolidayDto) => {
    setForm({
      name: holiday.name,
      date: holiday.date,
      isRecurring: holiday.isRecurring,
      isActive: holiday.isActive,
    });
    setEditingId(holiday.id!);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this holiday?")) {
      deleteMutation.mutate(id);
    }
  };

  const holidays = holidaysQuery.data ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white/90 tracking-tight">Holiday Management</h1>
          <p className="text-white/40 text-sm mt-1">Manage official holidays and recurring events.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 text-sm font-medium hover:bg-indigo-500/30 transition-colors"
        >
          <span className="text-lg">{showForm ? "×" : "+"}</span>
          {showForm ? "Cancel" : "Add Holiday"}
        </button>
      </div>

      {showForm && (
        <div className="bg-[#13151e] border border-white/[0.08] rounded-2xl p-6">
          <h2 className="text-white/90 font-semibold mb-4">{editingId ? "Edit Holiday" : "Add New Holiday"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Holiday Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Independence Day"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                  required
                />
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/50"
                />
                <span className="text-white/70 text-sm">Recurring (yearly)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/50"
                />
                <span className="text-white/70 text-sm">Active</span>
              </label>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-6 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-50"
              >
                {editingId ? "Update" : "Create"} Holiday
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-6 py-2 rounded-xl bg-white/5 text-white/40 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {holidaysQuery.isLoading ? (
        <div className="animate-pulse h-48 rounded-2xl bg-white/[0.04]" />
      ) : holidaysQuery.isError ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
          Could not load holidays. Please contact support.
        </div>
      ) : holidays.length === 0 ? (
        <div className="text-center py-20 bg-[#13151e] border border-white/[0.06] rounded-2xl">
          <div className="text-5xl mb-4">📅</div>
          <p className="text-white/40 text-sm">No holidays configured</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#13151e]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-white/40 text-xs uppercase tracking-wider">
                  <th className="px-5 py-3.5 font-medium">Holiday Name</th>
                  <th className="px-5 py-3.5 font-medium">Date</th>
                  <th className="px-5 py-3.5 font-medium">Recurring</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium w-48 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {holidays.map((holiday: HolidayDto) => (
                  <tr key={holiday.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-4 text-white/80 font-medium">{holiday.name}</td>
                    <td className="px-5 py-4 text-white/80">{fmtDate(holiday.date)}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        holiday.isRecurring 
                          ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25" 
                          : "bg-gray-500/15 text-gray-400 border border-gray-500/25"
                      }`}>
                        {holiday.isRecurring ? "Yearly" : "One-time"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        holiday.isActive 
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" 
                          : "bg-rose-500/15 text-rose-400 border border-rose-500/25"
                      }`}>
                        {holiday.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(holiday)}
                          className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(holiday.id!)}
                          className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
