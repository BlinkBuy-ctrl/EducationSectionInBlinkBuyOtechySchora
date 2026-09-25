// Read Section v3.0 — Tool 3: In-Document Highlighter
//
// Builds the PDF.js text layer (invisible, selectable spans positioned
// over the canvas) so the browser's native text selection works, then
// shows a small colour-picker popup near the selection. Picking a colour
// saves the highlight (studySession.ts) — which the Notes panel reads
// straight from, so nothing needs to be duplicated here.

import { useEffect, useRef, useState } from "react";
import { buildTextLayer } from "@/lib/pdfEngine";
import type { HighlightColor } from "@/lib/studySession";

const COLORS: { id: HighlightColor; hex: string }[] = [
  { id: "yellow", hex: "#facc15" },
  { id: "green", hex: "#4ade80" },
  { id: "pink", hex: "#f472b6" },
  { id: "blue", hex: "#60a5fa" },
];

interface Props {
  doc: any;
  pageNum: number;
  cssWidth: number;
  enabled: boolean; // only build/attach the text layer while the highlighter tool is on — saves work otherwise
  onHighlight: (text: string, color: HighlightColor) => void;
}

export function HighlightLayer({ doc, pageNum, cssWidth, enabled, onHighlight }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [popup, setPopup] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    if (!enabled || !layerRef.current || !doc) return;
    let cancelled = false;
    buildTextLayer(doc, pageNum, layerRef.current, cssWidth).then(ok => {
      if (cancelled || !ok) return;
    });
    return () => { cancelled = true; };
  }, [enabled, doc, pageNum, cssWidth]);

  useEffect(() => {
    if (!enabled) { setPopup(null); return; }
    const onSelectionChange = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (!sel || !text || sel.rangeCount === 0) { setPopup(null); return; }
      const range = sel.getRangeAt(0);
      const anchor = layerRef.current;
      if (!anchor || !anchor.contains(range.commonAncestorContainer)) { setPopup(null); return; }
      const rect = range.getBoundingClientRect();
      const parentRect = anchor.getBoundingClientRect();
      setPopup({ x: rect.left - parentRect.left + rect.width / 2, y: rect.top - parentRect.top, text });
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [enabled]);

  const pick = (color: HighlightColor) => {
    if (!popup) return;
    onHighlight(popup.text, color);
    window.getSelection()?.removeAllRanges();
    setPopup(null);
  };

  return (
    <>
      <div ref={layerRef} className="absolute inset-0 z-20"
        style={{ opacity: enabled ? 1 : 0, pointerEvents: enabled ? "auto" : "none", color: "transparent", userSelect: enabled ? "text" : "none" }} />
      {popup && (
        <div className="absolute z-40 flex items-center gap-1.5 bg-black/85 backdrop-blur-md rounded-full px-2 py-1.5 shadow-xl border border-white/10"
          style={{ left: popup.x, top: Math.max(popup.y - 44, 4), transform: "translateX(-50%)" }}>
          {COLORS.map(c => (
            <button key={c.id} onClick={() => pick(c.id)}
              className="w-5 h-5 rounded-full border border-white/30 active:scale-90 transition-transform"
              style={{ background: c.hex }} aria-label={c.id} />
          ))}
        </div>
      )}
    </>
  );
}
