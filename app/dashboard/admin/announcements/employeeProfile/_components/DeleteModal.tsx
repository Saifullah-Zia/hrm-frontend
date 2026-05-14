"use client";

import { useState } from "react";

export function DeleteModal({
  open,
  label,
  onClose,
  onConfirm,
}: {
  open: boolean;
  label?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#252840] bg-[#1a1d30] p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-white">Delete profile?</h3>
        <p className="mt-2 text-sm text-[#8b8fa8]">
          {label ? <>Remove profile for <span className="text-white">{label}</span>?</> : "This cannot be undone."}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-[#252840] px-4 py-2 text-sm text-[#8b8fa8] hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
