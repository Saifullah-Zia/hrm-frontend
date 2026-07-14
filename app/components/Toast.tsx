// app/components/Toast.tsx
import { useEffect } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: {
      bg: "bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5",
      text: "text-emerald-400",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      glow: "before:bg-emerald-500/20",
    },
    error: {
      bg: "bg-rose-500/10 border-rose-500/20 shadow-rose-500/5",
      text: "text-rose-400",
      icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
      glow: "before:bg-rose-500/20",
    },
    info: {
      bg: "bg-indigo-500/10 border-indigo-500/20 shadow-indigo-500/5",
      text: "text-indigo-400",
      icon: <Info className="w-5 h-5 text-indigo-400 shrink-0" />,
      glow: "before:bg-indigo-500/20",
    },
  };

  return (
    <div
      className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 animate-in slide-in-from-top-4 fade-in overflow-hidden max-w-sm ${config[type].bg}`}
    >
      {/* Icon */}
      {config[type].icon}

      {/* Message */}
      <p className="text-xs font-semibold text-white/90 leading-relaxed pr-2">{message}</p>

      {/* Close button */}
      <button
        onClick={onClose}
        className="ml-auto p-1 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all duration-200"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}