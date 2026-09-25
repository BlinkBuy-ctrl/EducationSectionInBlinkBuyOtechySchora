// The same little face used by Mrs SchoraHub (the floating focus-audio
// buddy in FocusPlayer.tsx) — reused here so the Read Section flow feels
// like the same companion talking to you, not a separate robotic system.

interface Props {
  size?: number;
  bob?: boolean;
}

export function CompanionFace({ size = 56, bob = false }: Props) {
  return (
    <div className={bob ? "companion-bob" : ""} style={{ width: size, height: size }}>
      <style>{`
        @keyframes companion-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes companion-blink { 0%,90%,100% { transform: scaleY(1); } 94% { transform: scaleY(.1); } }
        .companion-bob { animation: companion-bob 2.6s ease-in-out infinite; }
        .companion-eye { transform-box: fill-box; transform-origin: center; animation: companion-blink 4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .companion-bob, .companion-eye { animation: none !important; } }
      `}</style>
      <div style={{
        width: size, height: size, borderRadius: "9999px",
        background: "linear-gradient(135deg,#38bdf8,#2563eb)",
        boxShadow: "0 6px 18px rgba(37,99,235,.45)",
        border: "2px solid rgba(255,255,255,.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg viewBox="0 0 56 56" width={size - 4} height={size - 4}>
          <path d="M10 31 C10 11, 46 11, 46 31" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
          <rect x="6" y="28" width="9" height="15" rx="3.5" fill="#fff" />
          <rect x="41" y="28" width="9" height="15" rx="3.5" fill="#fff" />
          <circle cx="28" cy="33" r="12.5" fill="#fff" />
          <ellipse className="companion-eye" cx="23.5" cy="31.5" rx="1.9" ry="2.5" fill="#0c4a6e" />
          <ellipse className="companion-eye" cx="32.5" cy="31.5" rx="1.9" ry="2.5" fill="#0c4a6e" />
          <circle cx="20.5" cy="36" r="2.2" fill="#fda4af" opacity=".6" />
          <circle cx="35.5" cy="36" r="2.2" fill="#fda4af" opacity=".6" />
          <path d="M24 37.5 Q28 41 32 37.5" fill="none" stroke="#0c4a6e" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
