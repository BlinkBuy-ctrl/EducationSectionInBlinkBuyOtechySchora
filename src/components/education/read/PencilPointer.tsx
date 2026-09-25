// Read Section v3.0 — Tool 1: Visual Pencil Pointer
//
// A thin high-contrast line that tracks the pointer/touch vertically over
// the reading area. Pure CSS transform positioning — no canvas, no
// per-frame re-render, so it stays smooth even on older/weaker devices.

import { useEffect, useRef } from "react";

interface Props {
  active: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function PencilPointer({ active, containerRef }: Props) {
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    let raf = 0;
    const moveTo = (clientY: number) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        const y = clientY - rect.top;
        if (lineRef.current) lineRef.current.style.transform = `translateY(${y}px)`;
      });
    };

    const onMouseMove = (e: MouseEvent) => moveTo(e.clientY);
    const onTouchMove = (e: TouchEvent) => { if (e.touches[0]) moveTo(e.touches[0].clientY); };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("touchmove", onTouchMove);
      cancelAnimationFrame(raf);
    };
  }, [active, containerRef]);

  if (!active) return null;

  return (
    <div ref={lineRef} className="absolute left-0 right-0 z-30 pointer-events-none"
      style={{ top: 0, height: 0, willChange: "transform" }}>
      <div className="w-full" style={{
        height: 2,
        background: "linear-gradient(to right, transparent, #38bdf8 15%, #38bdf8 85%, transparent)",
        boxShadow: "0 0 8px rgba(56,189,248,0.8), 0 0 2px rgba(56,189,248,1)",
      }} />
    </div>
  );
}
