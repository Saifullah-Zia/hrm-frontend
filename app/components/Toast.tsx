// components/Toast.tsx
import { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: "bg-emerald-500/90 border-emerald-400 text-white",
    error: "bg-rose-500/90 border-rose-400 text-white",
    info: "bg-indigo-500/90 border-indigo-400 text-white",
  };

  const icons = {
    success: "✓",
    error: "✗",
    info: "ℹ",
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl border ${styles[type]} shadow-lg animate-in slide-in-from-right`}>
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold">{icons[type]}</span>
        <p className="text-sm">{message}</p>
        <button onClick={onClose} className="ml-4 text-white/70 hover:text-white">
          ×
        </button>
      </div>
    </div>
  );
}