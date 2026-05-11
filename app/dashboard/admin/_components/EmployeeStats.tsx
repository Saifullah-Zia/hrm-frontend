import { EmployeeProfileDto } from '@/types/employee';

interface Props { profiles: EmployeeProfileDto[] }

export function EmployeeStats({ profiles }: Props) {
  const active     = profiles.filter(p => p.employmentStatus === 'ACTIVE').length;
  const inactive   = profiles.filter(p => p.employmentStatus === 'INACTIVE').length;
  const terminated = profiles.filter(p => p.employmentStatus === 'TERMINATED').length;

  const cards = [
    { label: 'Total Employees', value: profiles.length, color: 'text-indigo-400'  },
    { label: 'Active',          value: active,           color: 'text-emerald-400' },
    { label: 'Inactive',        value: inactive,         color: 'text-amber-400'   },
    { label: 'Terminated',      value: terminated,       color: 'text-red-400'     },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {cards.map(c => (
        <div
          key={c.label}
          className="bg-[#1a1d30] border border-[#252840] rounded-xl p-4"
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#555870]">
            {c.label}
          </p>
          <p className={`text-3xl font-semibold mt-1 tabular-nums ${c.color}`}>
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}