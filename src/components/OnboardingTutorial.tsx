import { useState, useEffect, useRef } from "react";
import { ArrowUp, ArrowDown, X, CheckCircle2 } from "lucide-react";

interface Step {
  title: string;
  desc: string;
  emoji: string;
  // CSS selector of the element to highlight
  target?: string;
  // Where to show the tooltip relative to the highlight
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
    desc: "Tap this Upload button to share your resources and earn money. Your account is created automatically — no sign-up form ever.",
    target: "[data-tour='upload-btn']",
    tooltipPos: "below",
  },
  {
    emoji: "📚",
    title: "Browse Resources",
    desc: "These tabs let you switch between resources, scholarships, tutors, your saved items and your stats.",
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
    desc: "Use the bar at the bottom to jump between Home, My Stats, Search and Alerts from anywhere in the app.",
    target: "[data-tour='bottom-nav']",
    tooltipPos: "above",
  },
];

interface Rect { top: number; left: number; width: number; height: number; }

function getRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

interface Props {
  onDone: () => void;
  onUpload: () => void;
}

export function OnboardingTutorial({ onDone, onUpload }: Props) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef = useRef<number>(0);

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const isFirst = step === 0;

  // Track the target element's position live (handles scroll/resize)
  useEffect(() => {
    const update = () => {
      if (current.target) {
        setRect(getRect(current.target));
      } else {
        setRect(null);
      }
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [current.target]);

  // Scroll target into view
  useEffect(() => {
    if (current.target) {
      const el = document.querySelector(current.target);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [step, current.target]);

  const PAD = 8; // highlight padding

  const highlightStyle = rect ? {
    position: "fixed" as const,
    top:    rect.top  - PAD,
    left:   rect.left - PAD,
    width:  rect.width  + PAD * 2,
    height: rect.height + PAD * 2,
    borderRadius: 16,
    boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
    border: "2.5px solid rgba(167,139,250,0.9)",
    pointerEvents: "none" as const,
    zIndex: 9998,
    transition: "all 0.25s cubic-bezier(.4,0,.2,1)",
  } : undefined;

  // Tooltip position
  const tooltipBottom = (): string => {
    if (!rect) return "50%";
    if (current.tooltipPos === "above") {
      return `calc(100vh - ${rect.top - PAD - 12}px)`;
    }
    return "env(safe-area-inset-bottom, 24px)";
  };

  const tooltipTop = (): string | undefined => {
    if (!rect) return "50%";
    if (current.tooltipPos === "below") {
      return `${rect.top + rect.height + PAD + 12}px`;
    }
    return undefined;
  };

  const isCentered = !rect || current.tooltipPos === "center";

  return (
    <>
      {/* Overlay — only shown when no specific target (step 0) */}
      {!rect && (
        <div className="fixed inset-0 z-[9997] bg-black/72 backdrop-blur-[2px]" />
      )}

      {/* Highlight cutout */}
      {rect && <div style={highlightStyle} />}

      {/* Tooltip card */}
      <div
        className="fixed z-[9999] w-[88vw] max-w-sm"
        style={isCentered ? {
          top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
        } : current.tooltipPos === "below" ? {
          top: tooltipTop(),
          left: "50%",
          transform: "translateX(-50%)",
        } : {
          bottom: tooltipBottom(),
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        {/* Arrow pointing up to highlight */}
        {rect && current.tooltipPos === "below" && (
          <div className="flex justify-center mb-1">
            <ArrowUp className="w-5 h-5 text-purple-400 animate-bounce" />
          </div>
        )}

        <div className="bg-[#1a1f3a] border border-purple-500/40 rounded-2xl shadow-2xl shadow-purple-900/50 overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          <div className="p-5">
            {/* Step counter + close */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1">
                {STEPS.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === step ? "w-5 bg-purple-400" : i < step ? "w-2 bg-purple-400/50" : "w-2 bg-white/15"
                  }`} />
                ))}
              </div>
              <button onClick={onDone} className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 text-white/60 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl leading-none mt-0.5">{current.emoji}</span>
              <div>
                <h3 className="font-black text-white text-base leading-tight mb-1">{current.title}</h3>
                <p className="text-sm text-white/65 leading-relaxed">{current.desc}</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              {!isFirst && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/70 text-sm font-semibold active:scale-95 transition-all"
                >
                  Back
                </button>
              )}
              {isLast ? (
                <div className="flex-1 flex flex-col gap-2">
                  <button
                    onClick={onUpload}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold active:scale-95 transition-all shadow-lg shadow-purple-500/30"
                  >
                    ⬆️ Upload First Resource
                  </button>
                  <button
                    onClick={onDone}
                    className="w-full flex items-center justify-center gap-1.5 text-white/50 text-xs py-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> I'll explore first
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setStep(s => s + 1)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold active:scale-95 transition-all"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Arrow pointing down to highlight */}
        {rect && current.tooltipPos === "above" && (
          <div className="flex justify-center mt-1">
            <ArrowDown className="w-5 h-5 text-purple-400 animate-bounce" />
          </div>
        )}
      </div>
    </>
  );
}
