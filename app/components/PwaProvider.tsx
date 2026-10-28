"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_DAYS = 7;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Registers the service worker and shows a small "Install app" banner.
 * - Chrome/Edge/Android: uses the native install prompt.
 * - iOS Safari: shows "Share → Add to Home Screen" instructions.
 */
export default function PwaProvider() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {});
    }

    if (isStandalone()) return;

    let recentlyDismissed = false;
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
      recentlyDismissed = Date.now() - at < DISMISS_DAYS * 86_400_000;
    } catch {}
    if (recentlyDismissed) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (isIos()) {
      setShowIosHint(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  if (!visible || (!deferred && !showIosHint)) return null;

  return (
    <div
      role="dialog"
      aria-label="Install JCAT HRM"
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        zIndex: 9999,
        maxWidth: 420,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 14,
        background: "#171a23",
        color: "#e8e9ee",
        border: "1px solid rgba(252,1,117,0.35)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
        fontSize: 14,
      }}
    >
      <img src="/icons/icon-192.png" alt="" width={40} height={40} style={{ borderRadius: 10 }} />
      <div style={{ flex: 1, lineHeight: 1.35 }}>
        <strong style={{ display: "block" }}>Install JCAT HRM</strong>
        <span style={{ color: "#9aa0b0" }}>
          {deferred
            ? "Add the app to your device for quick access."
            : "Tap Share, then “Add to Home Screen”."}
        </span>
      </div>
      {deferred && (
        <button
          onClick={install}
          style={{
            background: "linear-gradient(90deg,#fc0175,#7c5cfc)",
            color: "#fff",
            border: 0,
            borderRadius: 9,
            padding: "8px 14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Install
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ background: "transparent", color: "#9aa0b0", border: 0, fontSize: 20, cursor: "pointer", lineHeight: 1 }}
      >
        ×
      </button>
    
    </div>
  );
}
