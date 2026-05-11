'use client';

import { useState } from 'react';

interface Props {
  open:       boolean;
  label?:     string;   // e.g. "User #5"
  onClose:    () => void;
  onConfirm:  () => Promise<void>;
}

export function DeleteModal({ open, label, onClose, onConfirm }: Props) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handle() {
    setLoading(true);
    try { await onConfirm(); }
    finally { setLoading(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#1a1d30] border border-[#252840] rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-2xl">
          🗑
        </div>

        <h3 className="text-[15px] font-semibold text-white mb-2">Delete Employee Profile</h3>
        <p className="text-sm text-[#8b8fa8] mb-6 leading-relaxed">
          {label
            ? <>Are you sure you want to delete <span className="text-white font-medium">{label}</span>?</>
            : 'Are you sure?'
          }{' '}
          This action <span className="text-red-400">cannot be undone</span>.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#2e3250] text-sm text-[#8b8fa8]
              hover:bg-white/5 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handle}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-sm text-red-400
              hover:bg-red-500/20 active:scale-95 disabled:opacity-50 transition-all"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}