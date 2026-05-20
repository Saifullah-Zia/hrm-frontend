import { useEffect, useState } from "react";
import {
  offboardingTaskApi,
  OffboardingTaskResponse,
  OffboardingTaskCategory,
  OffboardingTaskStatus,
} from "@/services/offboardingTaskApi";
import { ResignationResponse } from "@/services/resignationApi";

type SystemUser = { id: number; name: string; role: string; email: string };

const CATEGORIES: OffboardingTaskCategory[] = ["IT", "HR", "FINANCE", "ADMIN", "MANAGER", "LEGAL"];
const STATUSES: OffboardingTaskStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"];

export default function AdminOffboardingTasks({
  resignation,
  users,
  onTaskUpdate,
}: {
  resignation: ResignationResponse;
  users: SystemUser[];
  onTaskUpdate: () => void;
}) {
  const [tasks, setTasks] = useState<OffboardingTaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // New task form state
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [category, setCategory] = useState<OffboardingTaskCategory>("HR");
  const [dueDate, setDueDate] = useState("");
  const [assignedToUserId, setAssignedToUserId] = useState<number | "">("");

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await offboardingTaskApi.getByResignation(resignation.id);
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [resignation.id]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    setActionLoading(true);
    try {
      await offboardingTaskApi.create({
        resignationId: resignation.id,
        taskName: taskName.trim(),
        taskDescription: taskDescription.trim() || undefined,
        category,
        dueDate: dueDate || undefined,
        assignedToUserId: assignedToUserId ? Number(assignedToUserId) : undefined,
      });
      setShowAdd(false);
      setTaskName("");
      setTaskDescription("");
      setDueDate("");
      setAssignedToUserId("");
      await loadTasks();
      onTaskUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: OffboardingTaskStatus) => {
    setActionLoading(true);
    try {
      await offboardingTaskApi.update(id, { taskStatus: status });
      await loadTasks();
      onTaskUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "PENDING": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "IN_PROGRESS": return "text-sky-400 bg-sky-500/10 border-sky-500/20";
      case "SKIPPED": return "text-white/40 bg-white/5 border-white/10";
      default: return "text-white/50 bg-white/5 border-white/10";
    }
  };

  if (loading) {
    return <div className="text-white/40 text-sm animate-pulse">Loading tasks...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white/90 text-sm font-semibold">Offboarding Checklist</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          {showAdd ? "Cancel" : "+ Add Task"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleCreateTask} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-1 block">Task Name</label>
            <input
              required
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              className="w-full bg-[#13151e] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-1 block">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as OffboardingTaskCategory)}
                className="w-full bg-[#13151e] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-indigo-500/50"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-1 block">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-[#13151e] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-1 block">Assign To (Optional)</label>
            <select
              value={assignedToUserId}
              onChange={e => setAssignedToUserId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full bg-[#13151e] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-indigo-500/50"
            >
              <option value="">-- Employee Responsibility ({resignation.employeeName}) --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-1 block">Description</label>
            <input
              value={taskDescription}
              onChange={e => setTaskDescription(e.target.value)}
              className="w-full bg-[#13151e] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={actionLoading}
            className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            Create Task
          </button>
        </form>
      )}

      {tasks.length === 0 ? (
        <p className="text-white/40 text-xs italic">No offboarding tasks found.</p>
      ) : (
        <div className="space-y-3">
          {tasks.map(t => (
            <div key={t.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm text-white/90 font-medium leading-tight">{t.taskName}</p>
                  {t.taskDescription && <p className="text-xs text-white/40 mt-0.5">{t.taskDescription}</p>}
                </div>
                <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold tracking-wider ${getStatusColor(t.taskStatus)}`}>
                  {t.taskStatus}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/30 mb-3">
                <span><strong className="text-white/40 font-medium">Category:</strong> {t.category}</span>
                {t.dueDate && <span><strong className="text-white/40 font-medium">Due:</strong> {t.dueDate}</span>}
                <span><strong className="text-white/40 font-medium">Assignee:</strong> {t.assignedToName || "Employee"}</span>
              </div>

              {/* Status Actions */}
              <div className="flex gap-2">
                <select
                  disabled={actionLoading}
                  value={t.taskStatus}
                  onChange={(e) => handleUpdateStatus(t.id, e.target.value as OffboardingTaskStatus)}
                  className="bg-[#13151e] border border-white/[0.06] rounded text-xs text-white/70 px-2 py-1 focus:outline-none disabled:opacity-50"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
