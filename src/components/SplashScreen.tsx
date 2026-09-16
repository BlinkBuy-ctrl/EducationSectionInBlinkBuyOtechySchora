import { useEffect, useState } from "react";

// No canvas. Pure CSS + React state animations.
// Canvas was crashing old Android WebViews (Huawei budget devices):
//  - ctx.roundRect assignment throws on sealed prototypes
//  - 60fps GPU compositing + Supabase queries = OOM on low-RAM devices
//
// v2 — badge-shine intro -> sky-blue circular "flood" wipe -> logo assembly.
// Inspired by a reference brand-reveal animation. Still 100% transform/opacity
// CSS (no clip-path, no fake progress bar), so it stays smooth and safe on
// low-RAM WebViews.

const PILLS = ["📚 Past Papers", "🏆 Scholarships", "👨‍🏫 Tutors", "📖 Textbooks", "📝 Notes"];

// ── Timeline (ms) — tweak these to retime the whole sequence ──
const BADGE_IN      = 250;   // badge scales/fades in
const SHINE_START   = 300;   // shine sweep starts across the badge
const SHINE_DUR     = 420;
const FLOOD_START   = 650;   // sky-blue circle starts expanding from badge center
const FLOOD_DUR     = 520;   // time for the circle to fully cover the screen
const LOGO_START    = FLOOD_START + FLOOD_DUR - 120; // logo pops in just before the flood fully settles
const LOGO_DUR      = 260;
const TAGLINE_DELAY = 220;   // after LOGO_START
const PILLS_DELAY   = 400;   // after LOGO_START
const PILL_STAGGER  = 65;
const HOLD_AFTER    = 240;   // pause once everything's in place, so it can be read
const FADE_OUT_DUR  = 420;

const TOTAL = LOGO_START + PILLS_DELAY + PILLS.length * PILL_STAGGER + 260 + HOLD_AFTER;

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState<"intro" | "flooding" | "logo" | "hiding">("intro");

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage("flooding"), FLOOD_START));
    timers.push(setTimeout(() => setStage("logo"), LOGO_START));
    timers.push(setTimeout(() => setStage("hiding"), TOTAL));
    timers.push(setTimeout(() => onDone(), TOTAL + FADE_OUT_DUR));
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  const flooded = stage === "flooding" || stage === "logo" || stage === "hiding";
  const showLogo = stage === "logo" || stage === "hiding";
  const hiding = stage === "hiding";

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 99999,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg,#060818 0%,#100820 55%,#071020 100%)",
        opacity: hiding ? 0 : 1,
        transition: `opacity ${FADE_OUT_DUR}ms ease`,
        pointerEvents: hiding ? "none" : "all",
        WebkitUserSelect: "none",
        userSelect: "none",
        // Force GPU layer — prevents white flash on WebView paint
        WebkitTransform: "translateZ(0)",
        transform: "translateZ(0)",
        willChange: "opacity",
      }}
    >
      {/* Sky-blue circular flood — starts as a point at the badge, scales up
          to cover the whole screen. Transform-only (no clip-path), so it
          holds up on older WebViews. */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: "300vmax",
        height: "300vmax",
        borderRadius: "50%",
        background: "linear-gradient(160deg,#0ea5e9 0%,#0284c7 55%,#0369a1 100%)",
        WebkitTransform: `translate(-50%, -50%) scale(${flooded ? 1 : 0})`,
        transform: `translate(-50%, -50%) scale(${flooded ? 1 : 0})`,
        WebkitTransition: `transform ${FLOOD_DUR}ms cubic-bezier(0.22,1,0.36,1)`,
        transition: `transform ${FLOOD_DUR}ms cubic-bezier(0.22,1,0.36,1)`,
        pointerEvents: "none",
      }} />

      {/* ── Intro badge (dark stage) — crossfades out once the logo appears ── */}
      <div style={{
        position: "absolute",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: showLogo ? 0 : 1,
        transition: "opacity 220ms ease",
        pointerEvents: "none",
      }}>
        {/* Ambient glow behind the badge */}
        <div style={{
          position: "absolute",
          width: 220, height: 220,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(56,189,248,0.30) 0%, transparent 70%)",
        }} />

        {/* Badge ring */}
        <div className="schora-badge-in" style={{
          position: "relative",
          width: 92, height: 92,
          borderRadius: "50%",
          border: "2.5px solid rgba(125,211,252,0.9)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(56,189,248,0.06)",
        }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none"
            stroke="#7dd3fc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>

          {/* Shine sweep — a light bar masked by the badge's own border-radius */}
          <div className="schora-shine" style={{
            position: "absolute",
            top: "-40%",
            left: "-60%",
            width: "55%",
            height: "180%",
            background: "linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.85) 50%, transparent 100%)",
          }} />
        </div>
      </div>

      {/* ── Logo assembly (blue stage) ── */}
      <div style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: showLogo ? 1 : 0,
        WebkitTransform: showLogo ? "scale(1) translateY(0)" : "scale(0.82) translateY(8px)",
        transform: showLogo ? "scale(1) translateY(0)" : "scale(0.82) translateY(8px)",
        WebkitTransition: `opacity ${LOGO_DUR}ms cubic-bezier(0.34,1.56,0.64,1), transform ${LOGO_DUR}ms cubic-bezier(0.34,1.56,0.64,1)`,
        transition: `opacity ${LOGO_DUR}ms cubic-bezier(0.34,1.56,0.64,1), transform ${LOGO_DUR}ms cubic-bezier(0.34,1.56,0.64,1)`,
      }}>
        {/* Icon chip */}
        <div style={{
          width: 76, height: 76,
          borderRadius: 22,
          background: "rgba(255,255,255,0.16)",
          border: "1.5px solid rgba(255,255,255,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          boxShadow: "0 10px 30px rgba(2,8,23,0.25)",
        }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>

        <h1 style={{
          color: "#fff",
          fontSize: 30,
          fontWeight: 900,
          margin: 0,
          letterSpacing: -0.5,
          fontFamily: "system-ui,-apple-system,sans-serif",
          textShadow: "0 2px 12px rgba(2,8,23,0.25)",
        }}>
          SchoraHub
        </h1>

        <p style={{
          color: "rgba(255,255,255,0.9)",
          fontSize: 12,
          fontWeight: 700,
          margin: "6px 0 22px",
          letterSpacing: 0.3,
          fontFamily: "system-ui,-apple-system,sans-serif",
          opacity: showLogo ? 1 : 0,
          WebkitTransition: `opacity 260ms ease ${TAGLINE_DELAY}ms`,
          transition: `opacity 260ms ease ${TAGLINE_DELAY}ms`,
        }}>
          Education Hub · Malawi
        </p>

        {/* Feature pills */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          justifyContent: "center",
          maxWidth: 300,
          padding: "0 20px",
        }}>
          {PILLS.map((label, i) => {
            const delay = PILLS_DELAY + i * PILL_STAGGER;
            return (
              <span
                key={label}
                style={{
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "4px 11px",
                  borderRadius: 99,
                  whiteSpace: "nowrap",
                  fontFamily: "system-ui,-apple-system,sans-serif",
                  opacity: showLogo ? 1 : 0,
                  WebkitTransform: showLogo ? "translateY(0)" : "translateY(9px)",
                  transform: showLogo ? "translateY(0)" : "translateY(9px)",
                  WebkitTransition: `opacity 260ms ease ${delay}ms, -webkit-transform 260ms ease ${delay}ms`,
                  transition: `opacity 260ms ease ${delay}ms, transform 260ms ease ${delay}ms`,
                }}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Branding footer */}
      <p style={{
        position: "absolute",
        bottom: 28,
        margin: 0,
        color: "rgba(255,255,255,0.6)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.2,
        fontFamily: "system-ui,-apple-system,sans-serif",
        opacity: showLogo ? 1 : 0,
        transition: `opacity 300ms ease ${PILLS_DELAY + 100}ms`,
      }}>
        Powered By Otechy
      </p>

      {/* Keyframes injected once — works on all browsers including old WebKit */}
      <style>{`
        @-webkit-keyframes schora-badge-in-anim {
          from { opacity: 0; -webkit-transform: scale(0.7); }
          to   { opacity: 1; -webkit-transform: scale(1); }
        }
        @keyframes schora-badge-in-anim {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
        @-webkit-keyframes schora-badge-pulse {
          0%,100% { box-shadow: 0 0 26px rgba(56,189,248,0.35); }
          50%      { box-shadow: 0 0 48px rgba(56,189,248,0.65); }
        }
        @keyframes schora-badge-pulse {
          0%,100% { box-shadow: 0 0 26px rgba(56,189,248,0.35); }
          50%      { box-shadow: 0 0 48px rgba(56,189,248,0.65); }
        }
        .schora-badge-in {
          -webkit-animation: schora-badge-in-anim ${BADGE_IN}ms ease-out both,
                              schora-badge-pulse 1.6s ease-in-out ${BADGE_IN}ms infinite;
          animation: schora-badge-in-anim ${BADGE_IN}ms ease-out both,
                     schora-badge-pulse 1.6s ease-in-out ${BADGE_IN}ms infinite;
        }
        @-webkit-keyframes schora-shine-sweep {
          from { -webkit-transform: translateX(-40%) rotate(12deg); }
          to   { -webkit-transform: translateX(260%) rotate(12deg); }
        }
        @keyframes schora-shine-sweep {
          from { transform: translateX(-40%) rotate(12deg); }
          to   { transform: translateX(260%) rotate(12deg); }
        }
        .schora-shine {
          -webkit-animation: schora-shine-sweep ${SHINE_DUR}ms ease-in-out ${SHINE_START}ms both;
          animation: schora-shine-sweep ${SHINE_DUR}ms ease-in-out ${SHINE_START}ms both;
        }
      `}</style>
    </div>
  );
}
