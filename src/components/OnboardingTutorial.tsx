import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowUp, ArrowDown, X, CheckCircle2 } from "lucide-react";

interface Step {
  emoji: string;
  title: string;
  desc: string;
  target?: string;
  tooltipPos?: "above" | "below" | "center";
}

const STEPS: Step[] = [
  {
    emoji: "👋",
    title: "Welcome to SchoraHub!",
    desc: "Malawi's education hub — past papers, textbooks, notes, scholarships & tutors. No account needed. Let's take a quick tour.",
    tooltipPos: "center",
  },
  {
    emoji: "⬆️",
    title: "Upload & Share",
    desc: "Tap the Upload button to share resources and earn money. Your account is created automatically — no sign-up needed.",
    target: "[data-tour='upload-btn']",
    tooltipPos: "below",
  },
  {
    emoji: "📚",
    title: "Browse Resources",
    desc: "These tabs switch between resources, scholarships, tutors, saved items and your stats.",
    target: "[data-tour='tabs']",
    tooltipPos: "below",
  },
  {
    emoji: "🔽",
    title: "Download or Buy",
    desc: "Tap any resource card to preview it. Free resources download instantly — paid ones unlock after purchase.",
    target: "[data-tour='resource-grid']",
    tooltipPos: "above",
  },
  {
    emoji: "📱",
    title: "Bottom Navigation",
    desc: "Jump between Home, My Stats, Search and Alerts from anywhere in the app.",
    target: "[data-tour='bottom-nav']",
    tooltipPos: "above",
  },
];

interface Rect { top: number; left: number; width: number; height: number; }
interface Props { onDone: () => void; onUpload: () => void; }

const PAD = 8;
const VH  = () => window.innerHeight;
const VW  = () => window.innerWidth;

// Scroll inside the main container (not window)
function scrollElIntoView(el: Element) {
  const main = document.querySelector("main");
  if (main) {
    const mRect = main.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    // position of el relative to main's scroll content
    const elTop = eRect.top - mRect.top + main.scrollTop;
    const target = elTop - (main.clientHeight / 2) + (eRect.height / 2);
    main.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  } else {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

export function OnboardingTutorial({ onDone, onUpload }: Props) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef          = useRef<number>(0);
  const readyRef        = useRef(false);

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const isFirst = step === 0;

  const startTracking = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const track = () => {
      if (!current.target) { setRect(null); return; }
      const el = document.querySelector(current.target);
      if (!el) { rafRef.current = requestAnimationFrame(track); return; }
      const r = el.getBoundingClientRect();
      // Only show highlight if element is actually visible in viewport
      if (r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= VH() + 1) {
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else {
        setRect(null);
      }
      rafRef.current = requestAnimationFrame(track);
    };
    rafRef.current = requestAnimationFrame(track);
  }, [current.target]);

  useEffect(() => {
    readyRef.current = false;
    setRect(null);
    cancelAnimationFrame(rafRef.current);

    if (!current.target) {
      // No target = welcome screen, no tracking needed
      return;
    }

    const el = document.querySelector(current.target);
    if (el) scrollElIntoView(el);

    // Wait for scroll to settle, then start tracking
    const t = setTimeout(() => {
      readyRef.current = true;
      startTracking();
    }, 650);

    return () => {
      clearTimeout(t);
      cancelAnimationFrame(rafRef.current);
    };
  }, [step]); // eslint-disable-line

  // Highlight box
  const highlightStyle: React.CSSProperties | undefined = rect ? {
    position:      "fixed",
    top:           rect.top    - PAD,
    left:          rect.left   - PAD,
    width:         rect.width  + PAD * 2,
    height:        rect.height + PAD * 2,
    borderRadius:  12,
    boxShadow:     "0 0 0 9999px rgba(0,0,0,0.78)",
    border:        "2px solid rgba(167,139,250,0.95)",
    pointerEvents: "none",
    zIndex:        9998,
    transition:    "top .2s ease, left .2s ease, width .2s ease, height .2s ease",
  } : undefined;

  // Tooltip position — clamped to viewport
  const tooltipStyle = (): React.CSSProperties => {
    const W = "min(88vw, 340px)";
    const center: React.CSSProperties = {
      position: "fixed",
      top: "50%", left: "50%",
      transform: "translate(-50%,-50%)",
      width: W,
    };
    if (!rect || current.tooltipPos === "center") return center;

    if (current.tooltipPos === "below") {
      const top = rect.top + rect.height + PAD + 12;
      if (top + 220 > VH()) return center;
      return { position:"fixed", top, left:"50%", transform:"translateX(-50%)", width: W };
    }

    // above
    const bottom = VH() - (rect.top - PAD - 12);
    if (bottom + 220 > VH()) return center;
    return { position:"fixed", bottom, left:"50%", transform:"translateX(-50%)", width: W };
  };

  const showArrowUp   = !!rect && current.tooltipPos === "below";
  const showArrowDown = !!rect && current.tooltipPos === "above";
  const showOverlay   = !rect;

  return (
    <>
      {showOverlay && (
        <div className="fixed inset-0 z-[9997] bg-black/78 backdrop-blur-[2px]" />
      )}
      {rect && <div style={highlightStyle} />}

      <div style={tooltipStyle()} className="z-[9999]">
        {showArrowUp && (
          <div className="flex justify-center mb-2">
            <ArrowUp className="w-5 h-5 text-purple-400 animate-bounce" />
          </div>
        )}

        <div className="bg-[#0f1428] border border-purple-500/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-white/10">
            <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>

          <div className="p-4">
            {/* Dots + close */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1">
                {STEPS.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === step ? "w-5 bg-purple-400" : i < step ? "w-2 bg-purple-400/50" : "w-2 bg-white/15"
                  }`} />
                ))}
              </div>
              <button onClick={onDone}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 text-white/60 active:scale-95">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl leading-none mt-0.5">{current.emoji}</span>
              <div>
                <h3 className="font-black text-white text-sm leading-tight mb-1">{current.title}</h3>
                <p className="text-xs text-white/65 leading-relaxed">{current.desc}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {!isFirst && (
                <button onClick={() => setStep(s => s - 1)}
                  className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/70 text-sm font-semibold active:scale-95 transition-all">
                  Back
                </button>
              )}
              {isLast ? (
                <div className="flex-1 flex flex-col gap-2">
                  <button onClick={onUpload}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold active:scale-95 transition-all">
                    ⬆️ Upload First Resource
                  </button>
                  <button onClick={onDone}
                    className="w-full flex items-center justify-center gap-1.5 text-white/50 text-xs py-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> I'll explore first
                  </button>
                </div>
              ) : (
                <button onClick={() => setStep(s => s + 1)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold active:scale-95 transition-all">
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>

        {showArrowDown && (
          <div className="flex justify-center mt-2">
            <ArrowDown className="w-5 h-5 text-purple-400 animate-bounce" />
          </div>
        )}
      </div>
    </>
  );
}
