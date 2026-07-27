"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { EmployeeProfileDto } from "@/app/types/employee";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeProfileApi } from "@/services/employeeProfileApi";

interface EmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: EmployeeProfileDto; // If provided, edit mode. Else, create mode.
}

const EmployeeProfileModal = ({ isOpen, onClose, profile }: EmployeeProfileModalProps) => {
  const queryClient = useQueryClient();
  const isEdit = !!profile;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EmployeeProfileDto>({
    defaultValues: profile || {
      employmentStatus: "ACTIVE",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset(profile || { employmentStatus: "ACTIVE" });
    }
  }, [isOpen, profile, reset]);

  const createMutation = useMutation({
    mutationFn: (data: EmployeeProfileDto) => employeeProfileApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeeProfiles"] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: EmployeeProfileDto) => employeeProfileApi.update(profile!.id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeeProfiles"] });
      onClose();
    },
  });

  const onSubmit = (data: EmployeeProfileDto) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-white/[0.06] flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white/90">
            {isEdit ? "Edit Employee Profile" : "Create Employee Profile"}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <form id="profile-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* User ID - Required for Create */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-white/70 mb-1">User ID *</label>
              <input
                type="number"
                disabled={isEdit}
                {...register("userId", { required: "User ID is required", valueAsNumber: true })}
                className="w-full bg-[#0f1117] border border-white/[0.06] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
                placeholder="Enter User ID"
              />
              {errors.userId && <p className="text-rose-400 text-xs mt-1">{errors.userId.message}</p>}
            </div>

            {/* Department ID */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Department ID</label>
              <input
                type="number"
                {...register("departmentId", { valueAsNumber: true })}
                className="w-full bg-[#0f1117] border border-white/[0.06] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Position ID */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Position ID</label>
              <input
                type="number"
                {...register("positionId", { valueAsNumber: true })}
                className="w-full bg-[#0f1117] border border-white/[0.06] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Phone</label>
              <input
                {...register("phone")}
                className="w-full bg-[#0f1117] border border-white/[0.06] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* CNIC */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">CNIC Number</label>
              <input
                {...register("cnicNumber")}
                className="w-full bg-[#0f1117] border border-white/[0.06] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Date of Birth</label>
              <input
                type="date"
                {...register("dateOfBirth")}
                className="w-full bg-[#0f1117] border border-white/[0.06] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition [color-scheme:dark]"
              />
            </div>

            {/* Joining Date */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Joining Date</label>
              <input
                type="date"
                {...register("joiningDate")}
                className="w-full bg-[#0f1117] border border-white/[0.06] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition [color-scheme:dark]"
              />
            </div>

            {/* Address */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-white/70 mb-1">Address</label>
              <textarea
                {...register("address")}
                rows={2}
                className="w-full bg-[#0f1117] border border-white/[0.06] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition resize-none"
              ></textarea>
            </div>

            {/* Emergency Contact Name */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Emergency Contact</label>
              <input
                {...register("emergencyContactName")}
                className="w-full bg-[#0f1117] border border-white/[0.06] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Emergency Contact Phone */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Emergency Phone</label>
              <input
                {...register("emergencyContactPhone")}
                className="w-full bg-[#0f1117] border border-white/[0.06] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Status */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-white/70 mb-1">Status</label>
              <select
                {...register("employmentStatus")}
                className="w-full bg-[#0f1117] border border-white/[0.06] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3 bg-[#0f1117]/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.05] transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="profile-form"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-500/25 disabled:opacity-50"
          >
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfileModal;
