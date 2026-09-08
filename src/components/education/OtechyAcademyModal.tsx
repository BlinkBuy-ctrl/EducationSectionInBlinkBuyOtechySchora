import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { GraduationCap, Coins, Sparkles, X, Rocket } from "lucide-react";

/**
 * "Otechy Academy" — Income Skills placeholder.
 * Nothing is built yet, so this is a fun, animated "Coming Soon" screen
 * with a tiny tap-for-coins mini-game to keep it welcoming instead of blank.
 *
 * Opened from anywhere by firing: window.dispatchEvent(new CustomEvent("otechy:open-academy"))
 * Mounted once in Layout.tsx so every entry point (menu + My Stats) shares it.
 */

interface FloatingCoin { id: number; left: number; delay: number; duration: number; emoji: string; }

const EMOJIS = ["🪙", "💡", "🚀", "⭐"];

function makeCoins(count: number): FloatingCoin[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: 6 + Math.random() * 88,
    delay: Math.random() * 4,
    duration: 5 + Math.random() * 4,
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
  }));
}

export default function OtechyAcademyModal() {
  const [open, setOpen] = useState(false);
  const [xp, setXp] = useState(0);
  const [pops, setPops] = useState<{ id: number; x: number; y: number }[]>([]);
  const popId = useRef(0);
  const coins = useRef(makeCoins(10));

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("otechy:open-academy", handler);
    return () => window.removeEventListener("otechy:open-academy", handler);
  }, []);

  if (!open) return null;

  const tapCoin = (e: React.MouseEvent) => {
    setXp((v) => v + 1);
    const id = popId.current++;
    setPops((p) => [...p, { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => setPops((p) => p.filter((pop) => pop.id !== id)), 700);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-gradient-to-b from-sky-950 via-slate-950 to-slate-950 overflow-hidden animate-in fade-in duration-200">
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) rotate(0deg);   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(-92vh) rotate(20deg); opacity: 0; }
        }
        @keyframes popScore {
          0%   { transform: translate(-50%,-50%) scale(0.6); opacity: 1; }
          100% { transform: translate(-50%,-140%) scale(1.3); opacity: 0; }
        }
        @keyframes badgePulse {
          0%,100% { transform: scale(1); }
          50%     { transform: scale(1.06); }
        }
        @keyframes capBob {
          0%,100% { transform: translateY(0) rotate(-6deg); }
          50%     { transform: translateY(-10px) rotate(6deg); }
        }
      `}</style>

      {/* Close */}
      <button
        onClick={() => setOpen(false)}
        aria-label="Close"
        className="absolute top-4 right-4 z-20 w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/80 active:scale-90 transition-transform"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Floating tappable coins/icons */}
      <div className="absolute inset-0 z-0" onClick={tapCoin}>
        {coins.current.map((c) => (
          <span
            key={c.id}
            className="absolute bottom-0 text-2xl select-none cursor-pointer"
            style={{
              left: `${c.left}%`,
              animation: `floatUp ${c.duration}s linear ${c.delay}s infinite`,
            }}
          >
            {c.emoji}
          </span>
        ))}
      </div>

      {/* Score pop-ups on tap */}
      {pops.map((p) => (
        <span
          key={p.id}
          className="fixed z-30 text-sky-300 font-black text-sm pointer-events-none"
          style={{ left: p.x, top: p.y, animation: "popScore 0.7s ease-out forwards" }}
        >
          +1 XP
        </span>
      ))}

      {/* Main content */}
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

        <div
          className="px-4 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center gap-1.5"
          style={{ animation: "badgePulse 1.8s ease-in-out infinite" }}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span className="text-xs font-black text-amber-300 tracking-wide">COMING SOON</span>
        </div>

        <p className="text-sm text-white/60 max-w-[280px] leading-relaxed">
          We're building a place to learn real income-earning skills — right inside SchoraHub.
          Tap the floating coins while you wait 👆
        </p>

        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10">
          <Coins className="w-4 h-4 text-amber-300" />
          <span className="text-sm font-bold text-white">{xp} XP earned</span>
        </div>

        <button
          onClick={() => setOpen(false)}
          className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white text-sm font-bold shadow-lg shadow-sky-500/30 active:scale-95 transition-transform"
        >
          <Rocket className="w-4 h-4" />
          Got it, notify me later
        </button>
      </div>
    </div>,
    document.body
  );
}
