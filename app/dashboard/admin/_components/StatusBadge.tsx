import { EmploymentStatus } from '@/app/types/employee';

const CONFIG: Record<EmploymentStatus, { label: string; dot: string; wrapper: string }> = {
  ACTIVE: {
    label:   'Active',
    dot:     'bg-emerald-400',
    wrapper: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  },
  INACTIVE: {
    label:   'Inactive',
    dot:     'bg-amber-400',
    wrapper: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  },
  TERMINATED: {
    label:   'Terminated',
    dot:     'bg-red-400',
    wrapper: 'bg-red-500/10 text-red-400 border border-red-500/20',
  },
};

export function StatusBadge({ status }: { status: EmploymentStatus }) {
  const cfg = CONFIG[status] ?? CONFIG.INACTIVE;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cfg.wrapper}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}