// ============================================================
// components/OfflineBanner.tsx
// SchoraHub — Offline / Reconnected banner
// ============================================================

import { useEffect, useRef, useState } from "react";
import { CloudOff, CheckCircle2 } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setShowReconnected(false);
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      setShowReconnected(true);
      const t = setTimeout(() => setShowReconnected(false), 5000);
      return () => clearTimeout(t);
    }
  }, [online]);

  if (!online) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9999] flex items-start gap-2.5 px-4 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-black/20"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <CloudOff className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black leading-tight">Offline Mode</p>
          <p className="text-[11px] text-white/90 leading-snug mt-0.5">
            No internet connection detected. You're viewing previously saved content securely stored on your device.
            New books, universities, scholarships, tutors and other updates cannot be retrieved until your internet
            connection is restored. All previously cached content remains available.
          </p>
        </div>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9999] flex items-start gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-black/20 animate-in fade-in slide-in-from-top-3 duration-300"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black leading-tight">Connection Restored</p>
          <p className="text-[11px] text-white/90 leading-snug mt-0.5">
            You're back online. SchoraHub is checking for new books, universities, scholarships, tutors and other
            updates. Only new or modified content will be downloaded while keeping your cached data intact.
          </p>
        </div>
      </div>
    );
  }

  return null;
}