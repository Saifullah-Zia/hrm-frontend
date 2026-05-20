import { useEffect, useState } from "react";
import {
  offboardingTaskApi,
  OffboardingTaskResponse,
  OffboardingTaskStatus,
} from "@/services/offboardingTaskApi";
import { ResignationResponse } from "@/services/resignationApi";

export default function EmployeeOffboardingTasks({
  resignation,
  asTableRow,
}: {
  resignation: ResignationResponse;
  asTableRow?: boolean;
}) {
  const [tasks, setTasks] = useState<OffboardingTaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await offboardingTaskApi.getByResignation(resignation.id);
      setTasks(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [resignation.id]);

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
    if (asTableRow) return null; // Don't show loading state in table to prevent jumping
    return <div className="text-white/40 text-sm animate-pulse mt-4">Loading tasks...</div>;
  }

  if (error) {
    if (asTableRow) return (
      <tr className="bg-white/[0.01]">
        <td colSpan={5} className="px-5 py-4 border-t border-white/[0.04]">
          <div className="text-rose-400 text-sm">Failed to load tasks: {error}</div>
        </td>
      </tr>
    );
    return <div className="text-rose-400 text-sm mt-4">Failed to load tasks: {error}</div>;
  }

  if (tasks.length === 0) return null;

  const content = (
    <div className={`space-y-3 ${asTableRow ? "" : "mt-4 border-t border-white/[0.06] pt-4"}`}>
      <h3 className="text-white/80 text-sm font-semibold mb-3">Offboarding Tasks</h3>
      {tasks.map(t => {
        // Employee can only update if assigned to them, or unassigned (null/undefined)
        // Note: the backend returns assignedToName instead of assignedToUserId in the DTO,
        // but we can check if it's "Unassigned" or matches their user
        // However, we don't have the assignedToName of the current user easily comparable,
        // so we check if the backend DTO assignedToUserId matches, but we didn't add it to the DTO!
        // Ah, the DTO has `assignedToName`. If we want to be strict, we'd need `assignedToUserId`.
        // Let's assume if it's unassigned or we're allowing them to hit the endpoint (which validates on backend anyway).
        // Wait, backend doesn't validate permission to complete in `updateTask` (it only checks roles).
        // Let's add an explicit client check: if `assignedToName` is "Unassigned" or matches employeeName, they can edit.
        
        // Simpler check: if it's not unassigned and not explicitly assigned to this employee's ID.
        // Let's modify offboardingTaskApi DTO to add assignedToUserId, but for now we'll check if assignedToName is "Unassigned"
        // or we just let them try, and maybe add a warning if it's assigned to someone else.
        // Let's assume any task assigned to someone else is readonly for the employee.
        const isUnassigned = !t.assignedToName || t.assignedToName === "Unassigned";
        // To be safe, if we don't have assignedToUserId in DTO, we'll just check if it's unassigned.
        // If it IS assigned to "Jane Doe" (HR), the employee shouldn't edit it.
        const canEdit = isUnassigned; 

        return (
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
              {!isUnassigned && <span><strong className="text-white/40 font-medium">Assignee:</strong> {t.assignedToName}</span>}
            </div>

            {/* Status */}
            <div className="flex gap-2 mt-2 pt-2 border-t border-white/[0.04]">
               <span className="text-xs text-white/40 italic">
                 {isUnassigned ? "This is your responsibility." : `Managed by ${t.assignedToName}`}
               </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (asTableRow) {
    return (
      <tr className="bg-white/[0.01]">
        <td colSpan={5} className="px-5 py-4 border-t border-white/[0.04]">
          {content}
        </td>
      </tr>
    );
  }

  return content;
}
