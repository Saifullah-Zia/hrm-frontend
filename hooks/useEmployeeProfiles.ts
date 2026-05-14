"use client";

import { useCallback, useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import {
  employeeProfileApi,
  type EmployeeProfileDto,
} from "@/services/employeeProfileApi";

export interface DepartmentOption {
  id: number;
  name: string;
}

export interface PositionOption {
  id: number;
  title: string;
  departmentId?: number;
}

function errMessage(e: unknown): string {
  if (e && typeof e === "object" && "response" in e) {
    const d = (e as { response?: { data?: unknown } }).response?.data;
    if (typeof d === "string") return d;
    if (d && typeof d === "object" && "message" in d) {
      return String((d as { message: unknown }).message);
    }
  }
  if (e instanceof Error) return e.message;
  return "Request failed";
}

export function useEmployeeProfiles() {
  const [profiles, setProfiles] = useState<EmployeeProfileDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profRes, deptRes, posRes] = await Promise.all([
        employeeProfileApi.getAll(),
        apiClient.get<DepartmentOption[]>("/api/departments"),
        apiClient.get<PositionOption[]>("/api/positions"),
      ]);
      setProfiles(profRes);
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
      setPositions(Array.isArray(posRes.data) ? posRes.data : []);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createProfile = useCallback(async (dto: EmployeeProfileDto) => {
    const created = await employeeProfileApi.create(dto);
    setProfiles((prev) => [...prev, created]);
    return created;
  }, []);

  const updateProfile = useCallback(async (id: number, dto: EmployeeProfileDto) => {
    const updated = await employeeProfileApi.update(id, dto);
    setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const deleteProfile = useCallback(async (id: number) => {
    await employeeProfileApi.delete(id);
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    profiles,
    departments,
    positions,
    loading,
    error,
    reload: load,
    createProfile,
    updateProfile,
    deleteProfile,
  };
}
