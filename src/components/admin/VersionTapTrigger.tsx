import { useRef } from "react";

interface VersionTapTriggerProps {
  children: React.ReactNode;
  onUnlock: () => void;
  requiredTaps?: number;
  /** How long (ms) the person has between taps before the count resets. */
  windowMs?: number;
}

/**
 * Invisible tap-counter wrapper. Renders its children exactly as-is —
 * no visual change, no hint that anything is listening.
 *
 * Counts taps/clicks on whatever it wraps. Once `requiredTaps` land within
 * `windowMs` of each other, it fires `onUnlock()` once and resets.
 * A slow tap (gap longer than `windowMs`) resets the count back to zero,
 * so it can't be triggered by accident over the course of normal use.
 */
export function VersionTapTrigger({
  children,
  onUnlock,
  requiredTaps = 7,
  windowMs = 2500,
}: VersionTapTriggerProps) {
  const stateRef = useRef({ count: 0, timer: null as ReturnType<typeof setTimeout> | null });

  const handleTap = () => {
    const state = stateRef.current;
    state.count += 1;

    if (state.timer) clearTimeout(state.timer);

    if (state.count >= requiredTaps) {
      state.count = 0;
      onUnlock();
    } else {
      state.timer = setTimeout(() => {
        state.count = 0;
      }, windowMs);
    }
  };

  return (
    <div onClick={handleTap}>
      {children}
    </div>
  );
}
