// ============================================================
// components/OfflineBanner.tsx
// SchoraHub — Offline / Reconnected banner
//
// Offline banner shows briefly, hides itself, then reappears every so
// often as a reminder — instead of sitting on screen permanently.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { CloudOff, CheckCircle2 } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const OFFLINE_SHOW_MS = 4000;   // how long the offline banner stays visible each time
const OFFLINE_REPEAT_MS = 30000; // how often it reappears while still offline

export function OfflineBanner() {
  const online = useOnlineStatus();
  const [showOffline, setShowOffline] = useState(!online);
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setShowReconnected(false);
      setShowOffline(true);

      const hideTimer = setTimeout(() => setShowOffline(false), OFFLINE_SHOW_MS);
      const repeatTimer = setInterval(() => {
        setShowOffline(true);
        setTimeout(() => setShowOffline(false), OFFLINE_SHOW_MS);
      }, OFFLINE_REPEAT_MS);

      return () => {
        clearTimeout(hideTimer);
        clearInterval(repeatTimer);
      };
    }

    setShowOffline(false);
    if (wasOffline.current) {
      wasOffline.current = false;
      setShowReconnected(true);
      const t = setTimeout(() => setShowReconnected(false), 5000);
      return () => clearTimeout(t);
    }
  }, [online]);

  if (!online && showOffline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9999] flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-black/20"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.6rem)" }}
      >
        <CloudOff className="w-4 h-4 shrink-0" />
        <p className="text-sm font-bold leading-tight">Offline Mode — Please connect to the internet</p>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9999] flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-black/20 animate-in fade-in slide-in-from-top-3 duration-300"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.6rem)" }}
      >
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <p className="text-sm font-bold leading-tight">You're back online</p>
      </div>
    );
  }

  return null;
}