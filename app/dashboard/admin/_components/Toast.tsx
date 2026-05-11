'use client';

import { useEffect } from 'react';

export type ToastType = 'success' | 'error';

interface Props {
  message: string;
  type:    ToastType;
  onDone:  () => void;
}

export function Toast({ message, type, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  const colours =
    type === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : 'border-red-500/30 bg-red-500/10 text-red-300';

  const icon = type === 'success' ? '✓' : '✕';

  return (
    <div
      className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 rounded-xl border px-4 py-3
        text-sm font-medium shadow-xl animate-in slide-in-from-bottom-4 ${colours}`}
    >
      <span className="text-base">{icon}</span>
      {message}
    </div>
  );
}

/* ── Hook to manage toast state ── */
import { useState, useCallback } from 'react';

interface ToastState { message: string; type: ToastType }

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  }, []);

  const clear = useCallback(() => setToast(null), []);

  return { toast, show, clear };
}