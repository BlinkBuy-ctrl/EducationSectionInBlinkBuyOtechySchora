import { useState, useEffect, useRef } from "react";
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
    title: "Welcome to OtechySchora!",
    desc: "Malawi's education hub — past papers, textbooks, notes, scholarships & tutors. No account needed. Let's take a quick tour.",
    tooltipPos: "center",
  },
  {
    emoji: "⬆️",
    title: "Upload & Share",
    desc: "Tap this Upload button to share your resources and earn money. Your account is created automatically — no sign-up needed.",
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

// Always use getBoundingClientRect — correct relative to viewport
function getRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // Skip if element is scrolled out of view
  if (r.bottom < 0 || r.top > window.innerHeight) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

interface Props { onDone: () => void; onUpload: () => void; }

const PAD = 10;

export function OnboardingTutorial({ onDone, onUpload }: Props) {
  const [step, setStep]   = useState(0);
  const [rect, setRect]   = useState<Rect | null>(null);
  const rafRef            = useRef<number>(0);
  const current           = STEPS[step];
  const isLast            = step === STEPS.length - 1;
  const isFirst           = step === 0;

  // Scroll target into view first, then start tracking
  useEffect(() => {
    setRect(null); // clear while scrolling
    if (!current.target) return;
    const el = document.querySelector(current.target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // Wait for scroll to finish before tracking
    const t = setTimeout(() => {
      cancelAnimationFrame(rafRef.current);
      const track = () => {
        setRect(getRect(current.target!));
        rafRef.current = requestAnimationFrame(track);
      };
      rafRef.current = requestAnimationFrame(track);
    }, 400);
    return () => { clearTimeout(t); cancelAnimationFrame(rafRef.current); };
  }, [step, current.target]);

  const highlightStyle = rect ? {
    position:     "fixed" as const,
    top:          rect.top    - PAD,
    left:         rect.left   - PAD,
    width:        rect.width  + PAD * 2,
    height:       rect.height + PAD * 2,
    borderRadius: 14,
    boxShadow:    "0 0 0 9999px rgba(0,0,0,0.75)",
    border:       "2.5px solid rgba(167,139,250,0.95)",
    pointerEvents:"none" as const,
    zIndex:       9998,
    transition:   "top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease",
  } : undefined;

  // Tooltip positioning — always relative to viewport rect
  const tooltipStyle = (): React.CSSProperties => {
    if (!rect || current.tooltipPos === "center") {
      return { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };
    }
    if (current.tooltipPos === "below") {
      const top = rect.top + rect.height + PAD + 14;
      // If tooltip would go off bottom of screen, flip to center
      if (top + 200 > window.innerHeight) {
        return { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };
      }
      return { top, left: "50%", transform: "translateX(-50%)" };
    }
    // above
    const bottom = window.innerHeight - (rect.top - PAD - 14);
    return { bottom, left: "50%", transform: "translateX(-50%)" };
  };

  const isCentered = !rect || current.tooltipPos === "center";
  const showArrowUp   = !!rect && current.tooltipPos === "below";
  const showArrowDown = !!rect && current.tooltipPos === "above";

  return (
    <>
      {/* Full overlay for step 0 (no target) */}
      {!rect && (
        <div className="fixed inset-0 z-[9997] bg-black/75 backdrop-blur-[2px]" />
      )}

      {/* Spotlight highlight */}
      {rect && <div style={highlightStyle} />}

      {/* Tooltip */}
      <div className="fixed z-[9999] w-[88vw] max-w-[340px]" style={tooltipStyle()}>

        {showArrowUp && (
          <div className="flex justify-center mb-1.5">
            <ArrowUp className="w-5 h-5 text-purple-400 animate-bounce" />
          </div>
        )}

        <div className="bg-[#12172b] border border-purple-500/50 rounded-2xl shadow-2xl overflow-hidden">
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
              <button onClick={onDone} className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 text-white/60">
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
          <div className="flex justify-center mt-1.5">
            <ArrowDown className="w-5 h-5 text-purple-400 animate-bounce" />
          </div>
        )}
      </div>
    </>
  );
}
