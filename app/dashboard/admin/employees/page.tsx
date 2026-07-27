"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeProfileApi } from "@/services/employeeProfileApi";
import { EmployeeProfileDto } from "@/app/types/employee";
import EmployeeProfileModal from "./components/EmployeeProfileModal";

export default function AdminEmployeeProfiles() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<EmployeeProfileDto | undefined>();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["employeeProfiles"],
    queryFn: () => employeeProfileApi.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => employeeProfileApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeeProfiles"] });
    },
  });

  const handleCreate = () => {
    setSelectedProfile(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (profile: EmployeeProfileDto) => {
    setSelectedProfile(profile);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this profile?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white/90 tracking-tight">Employee Profiles</h1>
          <p className="text-white/40 text-sm mt-1">Manage all employee details and statuses</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-indigo-500/25"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Profile
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="text-xs uppercase bg-[#0f1117]/50 text-white/40 border-b border-white/[0.06]">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">User ID</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Phone / CNIC</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Dept / Position</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Joining Date</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-white/40">
                    Loading profiles...
                  </td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-white/40">
                    No employee profiles found.
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-white/90">
                      #{profile.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-white/80">{profile.phone || "—"}</div>
                      <div className="text-xs text-white/40 mt-0.5">{profile.cnicNumber || "—"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-white/80">Dept: {profile.departmentId || "—"}</div>
                      <div className="text-xs text-white/40 mt-0.5">Pos: {profile.positionId || "—"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {profile.joiningDate || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide border ${
                          profile.employmentStatus === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : profile.employmentStatus === "INACTIVE"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {profile.employmentStatus || "UNKNOWN"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-3">
                      <button
                        onClick={() => handleEdit(profile)}
                        className="text-indigo-400 hover:text-indigo-300 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(profile.id!)}
                        className="text-rose-400 hover:text-rose-300 transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EmployeeProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        profile={selectedProfile}
      />
    </div>
  );
}
