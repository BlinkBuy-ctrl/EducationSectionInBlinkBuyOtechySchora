import { useEffect, useState } from "react";

// No canvas. Pure CSS + React state animations.
// Canvas was crashing old Android WebViews (Huawei budget devices):
//  - ctx.roundRect assignment throws on sealed prototypes
//  - 60fps GPU compositing + Supabase queries = OOM on low-RAM devices

const PILLS = ["📚 Past Papers", "🏆 Scholarships", "👨‍🏫 Tutors", "📖 Textbooks", "📝 Notes"];
const DURATION = 2400; // ms — fast enough to feel snappy, long enough to look intentional

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    let startTime = 0;
    let raf = 0;

    function tick(now: number) {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const pct = Math.min(100, Math.round((elapsed / DURATION) * 100));
      setProgress(pct);

      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        // Short pause at 100% so user sees it, then fade and hand off
        setTimeout(() => setHiding(true), 180);
        setTimeout(() => onDone(), 660);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg,#060818 0%,#100820 55%,#071020 100%)",
        opacity: hiding ? 0 : 1,
        transition: "opacity 0.48s ease",
        pointerEvents: hiding ? "none" : "all",
        WebkitUserSelect: "none",
        userSelect: "none",
        // Force GPU layer — prevents white flash on WebView paint
        WebkitTransform: "translateZ(0)",
        transform: "translateZ(0)",
        willChange: "opacity",
      }}
    >
      {/* Ambient glow — CSS only, no canvas */}
      <div style={{
        position: "absolute",
        width: 240,
        height: 240,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(124,58,237,0.28) 0%, transparent 70%)",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%) translateY(-70px)",
        pointerEvents: "none",
      }} />

      {/* Icon box */}
      <div style={{
        width: 84,
        height: 84,
        borderRadius: 24,
        background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18,
        // CSS keyframe via inline <style> below
        animation: "schora-icon-pulse 2s ease-in-out infinite",
        WebkitAnimation: "schora-icon-pulse 2s ease-in-out infinite",
      }}>
        {/* Graduation cap — inline SVG, zero deps */}
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none"
          stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      </div>

      {/* Name + tagline */}
      <h1 style={{
        color: "#fff",
        fontSize: 28,
        fontWeight: 900,
        margin: 0,
        letterSpacing: -0.5,
        fontFamily: "system-ui,-apple-system,sans-serif",
      }}>
        SchoraHub
      </h1>
      <p style={{
        color: "#a78bfa",
        fontSize: 12,
        fontWeight: 600,
        margin: "5px 0 26px",
        fontFamily: "system-ui,-apple-system,sans-serif",
      }}>
        Education Hub · Malawi
      </p>

      {/* Feature pills — stagger in as progress climbs */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        justifyContent: "center",
        maxWidth: 300,
        padding: "0 20px",
        marginBottom: 34,
      }}>
        {PILLS.map((label, i) => {
          const show = progress > i * 16;
          return (
            <span
              key={label}
              style={{
                background: "rgba(124,58,237,0.18)",
                border: "1px solid rgba(124,58,237,0.35)",
                color: "#c4b5fd",
                fontSize: 10,
                fontWeight: 700,
                padding: "4px 11px",
                borderRadius: 99,
                whiteSpace: "nowrap",
                fontFamily: "system-ui,-apple-system,sans-serif",
                opacity: show ? 1 : 0,
                // CSS transform fallback for iOS/old Android
                WebkitTransform: show ? "translateY(0)" : "translateY(9px)",
                transform: show ? "translateY(0)" : "translateY(9px)",
                WebkitTransition: "opacity 0.32s ease, -webkit-transform 0.32s ease",
                transition: "opacity 0.32s ease, transform 0.32s ease",
              }}
            >
              {label}
            </span>
          );
        })}
      </div>

      {/* Progress bar */}
      <div style={{ width: 220 }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 7,
        }}>
          <span style={{ color: "#c4b5fd", fontSize: 10, fontWeight: 700, fontFamily: "system-ui,-apple-system,sans-serif" }}>
            Loading resources…
          </span>
          <span style={{ color: "#a78bfa", fontSize: 11, fontWeight: 800, fontFamily: "system-ui,-apple-system,sans-serif" }}>
            {progress}%
          </span>
        </div>

        {/* Track */}
        <div style={{
          width: "100%",
          height: 5,
          background: "rgba(255,255,255,0.09)",
          borderRadius: 99,
          overflow: "hidden",
        }}>
          {/* Fill */}
          <div style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg,#7c3aed,#2563eb)",
            borderRadius: 99,
            // transition instead of canvas — GPU composited on all browsers
            WebkitTransition: "width 80ms linear",
            transition: "width 80ms linear",
            boxShadow: "0 0 10px rgba(124,58,237,0.6)",
          }} />
        </div>
      </div>

      {/* Branding footer */}
      <p style={{
        position: "absolute",
        bottom: 28,
        margin: 0,
        color: "rgba(255,255,255,0.25)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.2,
        fontFamily: "system-ui,-apple-system,sans-serif",
      }}>
        Powered By OTECHY
      </p>

      {/* Keyframes injected once — works on all browsers including old WebKit */}
      <style>{`
        @-webkit-keyframes schora-icon-pulse {
          0%,100% { box-shadow: 0 0 36px rgba(124,58,237,0.45), 0 8px 28px rgba(0,0,0,0.5); }
          50%      { box-shadow: 0 0 60px rgba(124,58,237,0.72), 0 0 90px rgba(37,99,235,0.22), 0 8px 28px rgba(0,0,0,0.5); }
        }
        @keyframes schora-icon-pulse {
          0%,100% { box-shadow: 0 0 36px rgba(124,58,237,0.45), 0 8px 28px rgba(0,0,0,0.5); }
          50%      { box-shadow: 0 0 60px rgba(124,58,237,0.72), 0 0 90px rgba(37,99,235,0.22), 0 8px 28px rgba(0,0,0,0.5); }
        }
      `}</style>
    </div>
  );
}
