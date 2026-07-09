import { useRef, useState } from "react";

interface AdminGestureGateProps {
  /** Fired when the dot is swiped/dragged RIGHT — rejects, screen just closes. */
  onReject: () => void;
  /** Fired when the dot is swiped/dragged LEFT — opens the login form. */
  onContinue: () => void;
}

const SWIPE_THRESHOLD = 50; // px of horizontal drag required to register as a real swipe

/**
 * The fullscreen gesture screen shown after the 7-tap trigger.
 * Intentionally shows nothing but a single dot — no text, no hints, no
 * indication of what it does. Anyone who lands here without knowing the
 * gesture has no clue which way to go.
 */
export function AdminGestureGate({ onReject, onContinue }: AdminGestureGateProps) {
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);
  const dragging = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startX.current = e.clientX;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || startX.current === null) return;
    setDragX(e.clientX - startX.current);
  };

  const handlePointerUp = () => {
    if (!dragging.current || startX.current === null) {
      setDragX(0);
      return;
    }
    const delta = dragX;
    dragging.current = false;
    startX.current = null;
    setDragX(0);

    if (delta >= SWIPE_THRESHOLD) {
      onReject();
    } else if (delta <= -SWIPE_THRESHOLD) {
      onContinue();
    }
    // Anything smaller than the threshold (a plain tap, a tiny wobble) does nothing —
    // it takes a deliberate swipe either direction to register.
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center touch-none select-none">
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ transform: `translateX(${dragX}px)` }}
        className="w-20 h-20 rounded-full bg-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.55)] cursor-grab active:cursor-grabbing transition-shadow"
      />
    </div>
  );
}
