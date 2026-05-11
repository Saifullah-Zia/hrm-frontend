const PALETTES = [
  'bg-indigo-500/20 text-indigo-300',
  'bg-teal-500/20   text-teal-300',
  'bg-amber-500/20  text-amber-300',
  'bg-rose-500/20   text-rose-300',
  'bg-emerald-500/20 text-emerald-300',
  'bg-sky-500/20    text-sky-300',
];

interface Props {
  /** Display name used to derive initials */
  name: string;
  /** Used only for deterministic colour pick */
  seed?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function EmployeeAvatar({ name, seed = 0, size = 'md' }: Props) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

  const palette = PALETTES[seed % PALETTES.length];

  const sz =
    size === 'sm' ? 'h-7 w-7 text-[10px]' :
    size === 'lg' ? 'h-11 w-11 text-sm'   :
    'h-9 w-9 text-xs';

  return (
    <div className={`${sz} ${palette} flex-shrink-0 rounded-full flex items-center justify-center font-semibold select-none`}>
      {initials || '?'}
    </div>
  );
}