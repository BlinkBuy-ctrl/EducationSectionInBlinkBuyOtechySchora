import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { GraduationCap, X, Clock, RotateCw } from "lucide-react";
import { safeGetItem, safeSetItem } from "@/lib/storage";

/**
 * "Otechy Academy" — Income Skills placeholder.
 * Nothing is built yet, so instead of a blank page this is a small
 * tap-to-hatch game: crack an egg, reveal a skill + a quick fact about it.
 * Capped at 3 hatches/day so there's a reason to come back tomorrow.
 *
 * Opened from anywhere by firing: window.dispatchEvent(new CustomEvent("otechy:open-academy"))
 * Mounted once in Layout.tsx so every entry point (menu + My Stats) shares it.
 */

const HATCH_KEY = "otechyschora_academy_hatches";
const MAX_HATCHES_PER_DAY = 3;
const TAPS_TO_HATCH = 3;

interface Skill { emoji: string; name: string; fact: string; }

const SKILLS: Skill[] = [
  { emoji: "💻", name: "Coding",            fact: "Freelance developers take on remote jobs for clients they've never met in person — the work ships over the internet, not a delivery van." },
  { emoji: "🎨", name: "Graphic Design",     fact: "A phone, Canva, and a portfolio of 5 solid designs is often enough to land your first paying client." },
  { emoji: "✍️", name: "Writing",           fact: "Freelance writers pitch articles to sites and publications abroad, then get paid per piece, no office required." },
  { emoji: "📱", name: "Social Media",       fact: "Small businesses often pay someone monthly just to plan and post their content, so they don't have to." },
  { emoji: "🎬", name: "Video Editing",      fact: "Short-form video editors are in demand because creators film fast but rarely enjoy the editing part." },
  { emoji: "🗣️", name: "Voiceover",          fact: "Ads, audiobooks, and explainer videos all need voices — and most of that work is recorded from home." },
];

function readHatchState(): { date: string; count: number } {
  const raw = safeGetItem(HATCH_KEY);
  const today = new Date().toDateString();
  if (!raw) return { date: today, count: 0 };
  try {
    const parsed = JSON.parse(raw);
    if (parsed.date !== today) return { date: today, count: 0 };
    return parsed;
  } catch {
    return { date: today, count: 0 };
  }
}

export default function OtechyAcademyModal() {
  const [open, setOpen] = useState(false);
  const [taps, setTaps] = useState(0);
  const [revealed, setRevealed] = useState<Skill | null>(null);
  const [hatchState, setHatchState] = useState(() => readHatchState());

  useEffect(() => {
    const handler = () => {
      setHatchState(readHatchState());
      setOpen(true);
    };
    window.addEventListener("otechy:open-academy", handler);
    return () => window.removeEventListener("otechy:open-academy", handler);
  }, []);

  if (!open) return null;

  const hatchesLeft = MAX_HATCHES_PER_DAY - hatchState.count;
  const locked = hatchesLeft <= 0;

  const tapEgg = () => {
    if (locked || revealed) return;
    const next = taps + 1;
    setTaps(next);
    if (next >= TAPS_TO_HATCH) {
      const skill = SKILLS[Math.floor(Math.random() * SKILLS.length)];
      setRevealed(skill);
      const updated = { date: hatchState.date, count: hatchState.count + 1 };
      setHatchState(updated);
      safeSetItem(HATCH_KEY, JSON.stringify(updated));
    }
  };

  const nextEgg = () => {
    setTaps(0);
    setRevealed(null);
  };

  const crackStage = Math.min(taps, TAPS_TO_HATCH);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-gradient-to-b from-sky-950 via-slate-950 to-slate-950 overflow-hidden animate-in fade-in duration-200">
      <style>{`
        @keyframes capBob {
          0%,100% { transform: translateY(0) rotate(-6deg); }
          50%     { transform: translateY(-10px) rotate(6deg); }
        }
        @keyframes eggShake {
          0%, 100% { transform: rotate(0deg); }
          25%      { transform: rotate(-8deg); }
          75%      { transform: rotate(8deg); }
        }
        @keyframes revealPop {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <button
        onClick={() => setOpen(false)}
        aria-label="Close"
        className="absolute top-4 right-4 z-20 w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/80 active:scale-90 transition-transform"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center gap-5">
        <div
          className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-xl shadow-sky-500/30"
          style={{ animation: "capBob 2.4s ease-in-out infinite" }}
        >
          <GraduationCap className="w-10 h-10 text-white" />
        </div>

        <div>
          <p className="text-[11px] font-black tracking-[0.3em] uppercase text-sky-400 mb-1">Income Skills</p>
          <h1 className="text-2xl font-black text-white">Otechy Academy</h1>
        </div>

        <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-white/60" />
          <span className="text-xs font-black text-white/70 tracking-wide">STILL BUILDING THIS</span>
        </div>

        <p className="text-sm text-white/60 max-w-[280px] leading-relaxed">
          Real income-earning skills are landing here soon. For now — hatch a few eggs and see what you get.
        </p>

        {/* ── Game area ── */}
        {!locked ? (
          <div className="flex flex-col items-center gap-4">
            {!revealed ? (
              <button
                onClick={tapEgg}
                className="w-28 h-32 flex items-center justify-center select-none"
                style={{ animation: crackStage > 0 ? "eggShake 0.25s ease-in-out" : undefined }}
              >
                <span className="text-6xl">
                  {crackStage < 2 ? "🥚" : "🐣"}
                </span>
              </button>
            ) : (
              <div
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-2"
                style={{ animation: "revealPop 0.4s ease-out" }}
              >
                <span className="text-4xl">{revealed.emoji}</span>
                <p className="text-sm font-black text-white">{revealed.name}</p>
                <p className="text-xs text-white/60 leading-relaxed">{revealed.fact}</p>
              </div>
            )}

            <p className="text-[11px] font-bold text-white/40">
              {revealed
                ? `${hatchesLeft - 1} more egg${hatchesLeft - 1 === 1 ? "" : "s"} left today`
                : `Tap ${TAPS_TO_HATCH - taps} more time${TAPS_TO_HATCH - taps === 1 ? "" : "s"} to hatch`}
            </p>

            {revealed && hatchesLeft > 1 && (
              <button
                onClick={nextEgg}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold active:scale-95 transition-transform"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Next egg
              </button>
            )}
          </div>
        ) : (
          <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-sm font-bold text-white">🔥 That's all 3 for today</p>
            <p className="text-xs text-white/50 mt-1">Come back tomorrow for more skill reveals</p>
          </div>
        )}

        <button
          onClick={() => setOpen(false)}
          className="mt-2 px-5 py-2.5 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white text-sm font-bold shadow-lg shadow-sky-500/30 active:scale-95 transition-transform"
        >
          Close for now
        </button>
      </div>
    </div>,
    document.body
  );
}
