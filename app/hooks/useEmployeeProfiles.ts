'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  employeeProfileService,
  departmentService,
  positionService,
} from '@/services/employee-service';

import { EmployeeProfileDto, Department, Position } from '@app/types/employee';

export function useEmployeeProfiles() {
  const [profiles,    setProfiles]    = useState<EmployeeProfileDto[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions,   setPositions]   = useState<Position[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  /* ── Fetch all data in parallel ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profs, depts, pos] = await Promise.all([
        employeeProfileService.getAll(),
        departmentService.getAll(),
        positionService.getAll(),
      ]);
      setProfiles(profs);
      setDepartments(depts);
      setPositions(pos);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Mutations ── */
  const createProfile = async (dto: EmployeeProfileDto) => {
    const created = await employeeProfileService.create(dto);
    setProfiles(prev => [...prev, created]);
    return created;
  };

  const updateProfile = async (id: number, dto: EmployeeProfileDto) => {
    const updated = await employeeProfileService.update(id, dto);
    setProfiles(prev => prev.map(p => (p.id === id ? updated : p)));
    return updated;
  };

  const deleteProfile = async (id: number) => {
    await employeeProfileService.delete(id);
    setProfiles(prev => prev.filter(p => p.id !== id));
  };

  return {
    profiles, departments, positions,
    loading, error,
    refetch: fetchAll,
    createProfile, updateProfile, deleteProfile,
  };
}