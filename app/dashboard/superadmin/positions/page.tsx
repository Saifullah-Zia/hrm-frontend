"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DepartmentDTO {
  id: number;
  name: string;
}

interface PositionDTO {
  id: number;
  title: string;
  description?: string;
  departmentId?: number;
  departmentName?: string;
}

interface CreatePositionPayload {
  title: string;
  description?: string;
  departmentId: number;
}

// ─── API Layer ────────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = localStorage.getItem("token");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

const positionApi = {
  getAll: () =>
    apiFetch<PositionDTO[]>("/api/positions"),

  create: (payload: CreatePositionPayload) =>
    apiFetch<PositionDTO>("/api/positions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (
    id: number,
    payload: Partial<PositionDTO>
  ) =>
    apiFetch<PositionDTO>(`/api/positions/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  delete: (id: number) =>
    apiFetch<string>(`/api/positions/${id}`, {
      method: "DELETE",
    }),
};

const departmentApi = {
  getAll: () =>
    apiFetch<DepartmentDTO[]>("/api/departments"),
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icon = ({
  d,
  className = "w-4 h-4",
}: {
  d: string;
  className?: string;
}) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.6}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d={d}
    />
  </svg>
);

const ICONS = {
  plus:
    "M12 4v16m8-8H4",

  search:
    "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",

  edit:
    "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",

  trash:
    "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",

  close:
    "M6 18L18 6M6 6l12 12",

  briefcase:
    "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2H10a2 2 0 00-2 2v2m8 0H8m8 0h3a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h3",
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputClass =
  "w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40 transition-colors";

const textareaClass =
  "w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40 transition-colors resize-none";

const selectClass =
  "w-full px-3 py-2.5 text-sm rounded-xl bg-[#1a1d2e] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40 transition-colors";

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#13151e] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
        {label}
      </label>

      {children}
    </div>
  );
}

// ─── Position Form Modal ──────────────────────────────────────────────────────

function PositionFormModal({
  open,
  onClose,
  onSave,
  editPosition,
  departments,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (
    data:
      | CreatePositionPayload
      | Partial<PositionDTO>
  ) => Promise<void>;
  editPosition?: PositionDTO | null;
  departments: DepartmentDTO[];
}) {
  const isEdit = Boolean(editPosition);

  const [form, setForm] = useState({
    title: "",
    description: "",
    departmentId: "",
  });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (editPosition) {
      setForm({
        title: editPosition.title,
        description:
          editPosition.description ?? "",
        departmentId: String(
          editPosition.departmentId ?? ""
        ),
      });
    } else {
      setForm({
        title: "",
        description: "",
        departmentId: "",
      });
    }

    setError("");
  }, [editPosition, open]);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const payload = {
        title: form.title,
        description: form.description,
        departmentId: Number(form.departmentId),
      };

      await onSave(payload);

      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-white/90">
          {isEdit
            ? "Edit Position"
            : "Add Position"}
        </h2>

        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/70 transition-colors"
        >
          <Icon d={ICONS.close} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <FormField label="Position Title">
          <input
            type="text"
            className={inputClass}
            placeholder="Software Engineer"
            value={form.title}
            onChange={(e) =>
              setForm({
                ...form,
                title: e.target.value,
              })
            }
            required
          />
        </FormField>

        <FormField label="Department">
          <select
            className={selectClass}
            value={form.departmentId}
            onChange={(e) =>
              setForm({
                ...form,
                departmentId: e.target.value,
              })
            }
            required
          >
            <option value="">
              Select Department
            </option>

            {departments.map((dept) => (
              <option
                key={dept.id}
                value={dept.id}
              >
                {dept.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Description">
          <textarea
            rows={4}
            className={textareaClass}
            placeholder="Position description..."
            value={form.description}
            onChange={(e) =>
              setForm({
                ...form,
                description: e.target.value,
              })
            }
          />
        </FormField>

        {error && (
          <p className="text-xs text-rose-400 mb-4 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-white/50 border border-white/[0.08] rounded-xl hover:bg-white/[0.05] hover:text-white/80 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-600/20"
          >
            {loading
              ? "Saving..."
              : "Save Position"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({
  open,
  onClose,
  onConfirm,
  positionName,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  positionName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset error when modal opens/closes
  useEffect(() => {
    if (!open) setError("");
  }, [open]);

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete position. It may still be assigned to employees."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
          <Icon
            d={ICONS.trash}
            className="w-5 h-5 text-rose-400"
          />
        </div>

        <h2 className="text-base font-semibold text-white/90">
          Delete Position?
        </h2>
      </div>

      <p className="text-sm text-white/40 mb-6 leading-relaxed">
        Are you sure you want to delete{" "}
        <span className="text-white/70 font-medium">
          {positionName}
        </span>
        ? This will fail if any employees are currently assigned to this position.
      </p>

      {error && (
        <p className="text-xs text-rose-400 mb-4 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
          ⚠️ {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-white/50 border border-white/[0.08] rounded-xl hover:bg-white/[0.05] hover:text-white/80 transition-colors"
        >
          Cancel
        </button>

        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-500 disabled:opacity-50 transition-colors shadow-lg shadow-red-600/20"
        >
          {loading ? "Deleting..." : "Delete"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PositionManagementPage() {
  const [positions, setPositions] =
    useState<PositionDTO[]>([]);

  const [departments, setDepartments] =
    useState<DepartmentDTO[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editPosition, setEditPosition] =
    useState<PositionDTO | null>(null);

  const [showDelete, setShowDelete] =
    useState(false);

  const [deletePosition, setDeletePosition] =
    useState<PositionDTO | null>(null);

  // ─── Fetch Data ────────────────────────────────────────────────────────────

  async function fetchData() {
    setLoading(true);

    try {
      const [positionsData, departmentsData] =
        await Promise.all([
          positionApi.getAll(),
          departmentApi.getAll(),
        ]);

      setPositions(positionsData);
      setDepartments(departmentsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function handleSave(
    data:
      | CreatePositionPayload
      | Partial<PositionDTO>
  ) {
    if (editPosition) {
      const updated =
        await positionApi.update(
          editPosition.id,
          data
        );

      setPositions((prev) =>
        prev.map((p) =>
          p.id === updated.id
            ? updated
            : p
        )
      );
    } else {
      const created =
        await positionApi.create(
          data as CreatePositionPayload
        );

      setPositions((prev) => [
        ...prev,
        created,
      ]);
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deletePosition) return;

    await positionApi.delete(
      deletePosition.id
    );

    setPositions((prev) =>
      prev.filter(
        (p) => p.id !== deletePosition.id
      )
    );
  }

  // ─── Filter ────────────────────────────────────────────────────────────────

  const filtered = positions.filter(
    (position) =>
      position.title
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      position.departmentName
        ?.toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0f1117] p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-7">
          <div>
            <h1 className="text-xl font-semibold text-white/90 tracking-tight">
              Position Management
            </h1>

            <p className="text-sm text-white/35 mt-0.5">
              Manage employee positions
            </p>
          </div>

          <button
            onClick={() => {
              setEditPosition(null);
              setShowForm(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/25"
          >
            <Icon
              d={ICONS.plus}
              className="w-4 h-4"
            />

            Add Position
          </button>
        </div>

        {/* Search */}

        <div className="relative mb-4 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25">
            <Icon
              d={ICONS.search}
              className="w-4 h-4"
            />
          </span>

          <input
            type="text"
            placeholder="Search positions..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40 transition-colors"
          />
        </div>

        {/* Table */}

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                  Position
                </th>

                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                  Department
                </th>

                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                  Description
                </th>

                <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-14 text-white/25"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-14 text-white/25"
                  >
                    No positions found
                  </td>
                </tr>
              ) : (
                filtered.map((position) => (
                  <tr
                    key={position.id}
                    className="border-t border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                  >
                    {/* Position */}

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-300">
                          <Icon
                            d={ICONS.briefcase}
                            className="w-4 h-4"
                          />
                        </div>

                        <div>
                          <p className="text-white/85 font-medium">
                            {position.title}
                          </p>

                          <p className="text-xs text-white/30">
                            ID: {position.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Department */}

                    <td className="px-5 py-4 text-white/40">
                      {position.departmentName ||
                        "-"}
                    </td>

                    {/* Description */}

                    <td className="px-5 py-4 text-white/40">
                      {position.description ||
                        "No description"}
                    </td>

                    {/* Actions */}

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditPosition(
                              position
                            );
                            setShowForm(true);
                          }}
                          className="p-1.5 rounded-lg text-white/25 hover:text-indigo-400 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 transition-all"
                        >
                          <Icon
                            d={ICONS.edit}
                            className="w-3.5 h-3.5"
                          />
                        </button>

                        <button
                          onClick={() => {
                            setDeletePosition(
                              position
                            );
                            setShowDelete(true);
                          }}
                          className="p-1.5 rounded-lg text-white/25 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                        >
                          <Icon
                            d={ICONS.trash}
                            className="w-3.5 h-3.5"
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}

      <PositionFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        editPosition={editPosition}
        departments={departments}
      />

      <DeleteModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        positionName={
          deletePosition?.title ?? ""
        }
      />
    </div>
  );
}