"use client";

import { Wifi, MessageCircle, Phone } from "lucide-react";

// ── Change these two lines if the contact person/number ever changes ──
const URGENT_ACCESS_NUMBER_DISPLAY = "+92 347 4735404";
const URGENT_ACCESS_NUMBER_DIGITS = "923474735404"; // digits only (no +, spaces)

/** True when the backend rejected the login because of the Office Wi-Fi restriction. */
export function isOfficeWifiError(message: string | null | undefined): boolean {
  return !!message && /office\s*wi-?fi/i.test(message);
}

interface OfficeWifiNoticeProps {
  /** Email typed in the login form, included in the WhatsApp message. */
  email?: string;
}

export default function OfficeWifiNotice({ email }: OfficeWifiNoticeProps) {
  const text =
    "Hello, I need urgent access to JCAT HRM from outside the office Wi-Fi." +
    (email?.trim() ? ` My work email is ${email.trim()}.` : "");
  const whatsappUrl = `https://wa.me/${URGENT_ACCESS_NUMBER_DIGITS}?text=${encodeURIComponent(text)}`;

  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-left"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
          <Wifi className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-200">Connect to the Office Wi-Fi</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
            JCAT HRM can only be used on the office Wi-Fi. Please connect to it and sign in again.
          </p>
        </div>
      </div>

      <div className="mt-3 border-t border-amber-400/20 pt-3">
        <p className="text-xs text-amber-100/80">
          Need <span className="font-semibold text-amber-200">urgent access</span> from outside the
          office? Contact us on WhatsApp or call and we will give you access.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp {URGENT_ACCESS_NUMBER_DISPLAY}
          </a>
          <a
            href={`tel:+${URGENT_ACCESS_NUMBER_DIGITS}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
          >
            <Phone className="h-4 w-4" />
            Call
          </a>
        </div>
      </div>
    </div>
  );
}

