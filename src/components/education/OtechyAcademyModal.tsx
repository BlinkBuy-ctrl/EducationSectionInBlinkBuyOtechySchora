import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { 
  GraduationCap, X, Clock, RotateCw, Sparkles, 
  Flame, Trophy, BookOpen, Zap, Lock, CheckCircle2 
} from "lucide-react";
import { safeGetItem, safeSetItem } from "@/lib/storage";

const HATCH_KEY = "otechyschora_academy_hatches_v2";
const MAX_HATCHES_PER_DAY = 3;
const TAPS_TO_HATCH = 5; // Increased taps slightly for better build-up

export type SkillRarity = "common" | "rare" | "legendary";

export interface Skill {
  id: string;
  emoji: string;
  name: string;
  category: string;
  rarity: SkillRarity;
  fact: string;
  earningPotential: string;
}

const SKILLS: Skill[] = [
  { 
    id: "coding", 
    emoji: "💻", 
    name: "Full-Stack Web Dev", 
    category: "Development", 
    rarity: "legendary", 
    fact: "Freelance developers build web apps for global clients completely online — shipping code over GitHub, not a delivery truck.", 
    earningPotential: "$35 - $120/hr" 
  },
  { 
    id: "ai_prompting", 
    emoji: "🤖", 
    name: "AI Prompt Engineering", 
    category: "AI & Automation", 
    rarity: "legendary", 
    fact: "Companies hire prompt engineers to build automated workflows with ChatGPT and Claude without writing complex code from scratch.", 
    earningPotential: "$40 - $100/hr" 
  },
  { 
    id: "design", 
    emoji: "🎨", 
    name: "UI/UX & Graphic Design", 
    category: "Design", 
    rarity: "rare", 
    fact: "A modern portfolio with 5 solid mobile app screens in Figma or Canva is often enough to land your first paying client.", 
    earningPotential: "$25 - $75/hr" 
  },
  { 
    id: "video_editing", 
    emoji: "🎬", 
    name: "Short-Form Video Editing", 
    category: "Media", 
    rarity: "rare", 
    fact: "Creators film content fast but rarely enjoy cutting hooks and captions for TikTok and YouTube Shorts. That's where remote editors win.", 
    earningPotential: "$20 - $60/hr" 
  },
  { 
    id: "copywriting", 
    emoji: "✍️", 
    name: "Conversion Copywriting", 
    category: "Marketing", 
    rarity: "rare", 
    fact: "Copywriters craft sales pages, email sequences, and ad headlines that turn reader attention into direct purchases.", 
    earningPotential: "$30 - $85/hr" 
  },
  { 
    id: "social_media", 
    emoji: "📱", 
    name: "Social Media Growth", 
    category: "Marketing", 
    rarity: "common", 
    fact: "Small businesses regularly pay monthly retainers for someone to plan, schedule, and engage on their social media accounts.", 
    earningPotential: "$15 - $45/hr" 
  },
  { 
    id: "voiceover", 
    emoji: "🗣️", 
    name: "Voiceover & Audio", 
    category: "Media", 
    rarity: "common", 
    fact: "Commercials, audiobooks, and YouTube explainer channels hire voice talents remotely daily — recorded right from home setups.", 
    earningPotential: "$20 - $50/hr" 
  },
  { 
    id: "seo", 
    emoji: "🚀", 
    name: "SEO Optimization", 
    category: "Marketing", 
    rarity: "common", 
    fact: "SEO specialists help local businesses show up at the top of Google searches, driving organic customer leads.", 
    earningPotential: "$25 - $60/hr" 
  },
];

interface UserHatchData {
  date: string;
  count: number;
  unlockedSkillIds: string[];
  streak: number;
  lastHatchDate?: string;
}

function readHatchState(): UserHatchData {
  const raw = safeGetItem(HATCH_KEY);
  const today = new Date().toDateString();

  if (!raw) {
    return { date: today, count: 0, unlockedSkillIds: [], streak: 1 };
  }

  try {
    const parsed: UserHatchData = JSON.parse(raw);
    const isNewDay = parsed.date !== today;

    // Streak calculation
    let streak = parsed.streak || 1;
    if (isNewDay && parsed.lastHatchDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (parsed.lastHatchDate !== yesterday.toDateString()) {
        streak = 1; // Streak broken
      }
    }

    return {
      date: today,
      count: isNewDay ? 0 : parsed.count,
      unlockedSkillIds: parsed.unlockedSkillIds || [],
      streak,
      lastHatchDate: parsed.lastHatchDate
    };
  } catch {
    return { date: today, count: 0, unlockedSkillIds: [], streak: 1 };
  }
}

export default function OtechyAcademyModal() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"hatch" | "collection">("hatch");
  const [taps, setTaps] = useState(0);
  const [isAnimatingTap, setIsAnimatingTap] = useState(false);
  const [revealed, setRevealed] = useState<Skill | null>(null);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [hatchState, setHatchState] = useState<UserHatchData>(() => readHatchState());

  useEffect(() => {
    const handler = () => {
      setHatchState(readHatchState());
      setOpen(true);
    };
    window.addEventListener("otechy:open-academy", handler);
    return () => window.removeEventListener("otechy:open-academy", handler);
  }, []);

  // Device Vibration / Haptics helper
  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Safe fallback
      }
    }
  }, []);

  const spawnParticles = () => {
    const newParticles = Array.from({ length: 18 }).map((_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 160,
      y: (Math.random() - 0.5) * 160 - 20,
      color: ["#38bdf8", "#f59e0b", "#ec4899", "#a855f7", "#10b981"][Math.floor(Math.random() * 5)]
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1000);
  };

  if (!open) return null;

  const hatchesLeft = MAX_HATCHES_PER_DAY - hatchState.count;
  const locked = hatchesLeft <= 0;

  const tapEgg = () => {
    if (locked || revealed) return;

    triggerHaptic(30);
    setIsAnimatingTap(true);
    setTimeout(() => setIsAnimatingTap(false), 120);

    const next = taps + 1;
    setTaps(next);

    if (next >= TAPS_TO_HATCH) {
      triggerHaptic([50, 80, 150]);
      spawnParticles();

      // Prioritize undiscovered skills, then fallback to random
      const lockedSkills = SKILLS.filter(s => !hatchState.unlockedSkillIds.includes(s.id));
      const pool = lockedSkills.length > 0 ? lockedSkills : SKILLS;
      const skill = pool[Math.floor(Math.random() * pool.length)];

      setRevealed(skill);

      const updatedUnlocked = Array.from(new Set([...hatchState.unlockedSkillIds, skill.id]));
      const today = new Date().toDateString();

      const updatedState: UserHatchData = {
        ...hatchState,
        count: hatchState.count + 1,
        unlockedSkillIds: updatedUnlocked,
        lastHatchDate: today,
        streak: hatchState.lastHatchDate === today ? hatchState.streak : hatchState.streak + 1
      };

      setHatchState(updatedState);
      safeSetItem(HATCH_KEY, JSON.stringify(updatedState));
    }
  };

  const nextEgg = () => {
    setTaps(0);
    setRevealed(null);
  };

  const getRarityBadge = (rarity: SkillRarity) => {
    switch (rarity) {
      case "legendary":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Legendary</span>;
      case "rare":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1"><Zap className="w-3 h-3" /> Rare</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">Common</span>;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 text-white overflow-hidden animate-in fade-in duration-200">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-sky-500/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-indigo-500/15 blur-[120px] rounded-full pointer-events-none" />

      <style>{`
        @keyframes eggBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(1.03); }
        }
        @keyframes floatParticle {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tw-translate-x), var(--tw-translate-y)) scale(0); opacity: 0; }
        }
        @keyframes popReveal {
          0% { transform: scale(0.7) translateY(20px); opacity: 0; }
          70% { transform: scale(1.05) translateY(-5px); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Top Bar */}
      <header className="relative z-20 flex items-center justify-between p-4 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wide leading-none">Otechy Academy</h1>
            <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mt-0.5">Income Skills</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black">
            <Flame className="w-3.5 h-3.5 fill-amber-400" />
            <span>{hatchState.streak} Day Streak</span>
          </div>

          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 active:scale-90 transition-transform"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="relative z-10 flex border-b border-white/10 bg-white/5 p-1 gap-1 mx-4 mt-3 rounded-xl">
        <button
          onClick={() => setActiveTab("hatch")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "hatch"
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
              : "text-white/60 hover:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Hatch Egg ({hatchesLeft} Left)
        </button>
        <button
          onClick={() => setActiveTab("collection")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "collection"
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
              : "text-white/60 hover:text-white"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Collection ({hatchState.unlockedSkillIds.length}/{SKILLS.length})
        </button>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
        {activeTab === "hatch" ? (
          <div className="w-full max-w-sm flex flex-col items-center text-center gap-5 my-auto">
            {!locked ? (
              <>
                {!revealed ? (
                  <div className="relative flex flex-col items-center justify-center py-4">
                    {/* Tap Progress Arc/Ring */}
                    <div className="relative flex items-center justify-center w-36 h-36">
                      <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle
                          cx="72"
                          cy="72"
                          r="64"
                          className="stroke-white/10 fill-none"
                          strokeWidth="6"
                        />
                        <circle
                          cx="72"
                          cy="72"
                          r="64"
                          className="stroke-sky-400 fill-none transition-all duration-200"
                          strokeWidth="6"
                          strokeDasharray={402}
                          strokeDashoffset={402 - (402 * taps) / TAPS_TO_HATCH}
                          strokeLinecap="round"
                        />
                      </svg>

                      {/* Egg Button */}
                      <button
                        onClick={tapEgg}
                        className={`relative w-28 h-28 flex items-center justify-center rounded-full select-none cursor-pointer transition-transform active:scale-90 ${
                          isAnimatingTap ? "scale-90" : ""
                        }`}
                        style={{
                          animation: taps === 0 ? "eggBounce 2.5s ease-in-out infinite" : undefined
                        }}
                      >
                        <span className="text-7xl filter drop-shadow-[0_10px_15px_rgba(56,189,248,0.3)]">
                          {taps === 0 ? "🥚" : taps < 3 ? "🐣" : "🐥"}
                        </span>

                        {/* Visual Cracks Indicator */}
                        {taps > 0 && (
                          <span className="absolute text-xs font-black bg-sky-500 text-white px-2 py-0.5 rounded-full -bottom-1 shadow-md">
                            {taps}/{TAPS_TO_HATCH} TAPS
                          </span>
                        )}
                      </button>
                    </div>

                    <p className="text-xs font-bold text-white/60 mt-4">
                      Tap the egg to hatch a real-world income skill!
                    </p>
                  </div>
                ) : (
                  /* Revealed Card */
                  <div
                    className="w-full bg-slate-900/90 border border-white/15 rounded-3xl p-5 flex flex-col items-center gap-3 shadow-2xl relative overflow-hidden backdrop-blur-xl"
                    style={{ animation: "popReveal 0.5s ease-out forwards" }}
                  >
                    {/* Particle explosion elements */}
                    {particles.map((p) => (
                      <span
                        key={p.id}
                        className="absolute w-2.5 h-2.5 rounded-full pointer-events-none"
                        style={{
                          backgroundColor: p.color,
                          top: "50%",
                          left: "50%",
                          transform: `translate(${p.x}px, ${p.y}px)`,
                          transition: "all 0.8s ease-out",
                          opacity: 0.9
                        }}
                      />
                    ))}

                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-white/50">{revealed.category}</span>
                      {getRarityBadge(revealed.rarity)}
                    </div>

                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl shadow-inner my-1">
                      {revealed.emoji}
                    </div>

                    <div>
                      <h2 className="text-lg font-black text-white">{revealed.name}</h2>
                      <p className="text-[11px] font-black text-emerald-400 mt-0.5">
                        Avg Earning: {revealed.earningPotential}
                      </p>
                    </div>

                    <p className="text-xs text-white/70 bg-white/5 p-3 rounded-xl leading-relaxed border border-white/5 text-left">
                      💡 <span className="font-semibold">{revealed.fact}</span>
                    </p>

                    {hatchesLeft > 0 ? (
                      <button
                        onClick={nextEgg}
                        className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 active:scale-95 transition-transform"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        Hatch Next Egg ({hatchesLeft} left)
                      </button>
                    ) : (
                      <p className="text-xs font-bold text-amber-400 mt-1">
                        🎉 All hatches completed for today!
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Daily Limit Reached State */
              <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-white">Daily Limit Reached!</h3>
                <p className="text-xs text-white/60 leading-relaxed max-w-[260px]">
                  You&apos;ve completed all 3 hatches today. Check back tomorrow to maintain your <span className="text-amber-400 font-bold">{hatchState.streak}-day streak</span> and discover new skills!
                </p>

                <div className="w-full bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs font-bold text-white/70 mt-1">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-sky-400" /> Resets in</span>
                  <span>Midnight local time</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Collection Tab */
          <div className="w-full max-w-md h-full flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-white/60">Discovered Skills</span>
              <span className="text-xs font-black text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full">
                {hatchState.unlockedSkillIds.length} / {SKILLS.length} Unlocked
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[55vh] pr-1">
              {SKILLS.map((skill) => {
                const isUnlocked = hatchState.unlockedSkillIds.includes(skill.id);

                return (
                  <div
                    key={skill.id}
                    className={`p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                      isUnlocked
                        ? "bg-white/5 border-white/10"
                        : "bg-slate-900/40 border-white/5 opacity-50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0 mt-0.5">
                      {isUnlocked ? skill.emoji : <Lock className="w-4 h-4 text-white/40" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-black text-white truncate">
                          {isUnlocked ? skill.name : "Locked Skill"}
                        </h4>
                        {isUnlocked && getRarityBadge(skill.rarity)}
                      </div>

                      {isUnlocked ? (
                        <>
                          <p className="text-[10px] font-bold text-emerald-400 mt-0.5">{skill.earningPotential}</p>
                          <p className="text-[11px] text-white/60 leading-snug mt-1">{skill.fact}</p>
                        </>
                      ) : (
                        <p className="text-[11px] text-white/40 mt-1">Hatch more eggs to reveal this income skill.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-20 p-4 border-t border-white/10 bg-slate-950/80 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-white/50 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Full courses launching soon</span>
        </div>

        <button
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold active:scale-95 transition-transform"
        >
          Close
        </button>
      </footer>
    </div>,
    document.body
  );
}
