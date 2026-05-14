"use client";

import { useCallback, useEffect, useState } from "react";

type ToastType = "success" | "error";

interface ToastState {
  message: string;
  type: ToastType;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((message: string, type: ToastType = "success") => {
    setToast({ message, type });
  }, []);

  const clear = useCallback(() => setToast(null), []);

  return { toast, show, clear };
}

export function Toast({
  message,
  type,
  onDone,
}: {
  message: string;
  type: ToastType;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 3200);
    return () => window.clearTimeout(t);
  }, [message, type, onDone]);

  const box =
    type === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg ${box}`}
      role="status"
    >
      {message}
    </div>
  );
}
