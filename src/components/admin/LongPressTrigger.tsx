import { useRef } from "react";

interface LongPressTriggerProps {
  children: React.ReactNode;
  onUnlock: () => void;
  /** How long (ms) the press must be held before it fires. */
  holdMs?: number;
}

/**
 * Invisible press-and-hold wrapper — a second, independent entry point
 * into the admin flow, separate from VersionTapTrigger's tap-counting.
 *
 * Uses pointer events only (down/up/leave/cancel) — no click, no touchend —
 * so it can't be affected by anything that might be interfering with the
 * tap counter elsewhere.
 */
export function LongPressTrigger({ children, onUnlock, holdMs = 3000 }: LongPressTriggerProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = () => {
    clear();
    timerRef.current = setTimeout(onUnlock, holdMs);
  };

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div
      onPointerDown={start}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      style={{ touchAction: "manipulation" }}
    >
      {children}
    </div>
  );
}
