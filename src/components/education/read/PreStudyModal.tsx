// Read Section v3.0 — Step 1: Mrs SchoraHub checks in before you start
//
// Rebuilt from a rigid "fill in 3 required fields" form into a companion
// check-in: Mrs SchoraHub (the same character from the floating focus
// player) asks one open question, offers to go deeper if you want, and
// lets you skip straight to the book if you'd rather not stop and think
// right now. Whatever you do tell her gets saved to your own study
// journal on this phone (studySession.ts) — not thrown away, and next
// time you open this same book she'll remind you what you said.

import { useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { CompanionFace } from "./CompanionFace";
import type { StudyGoals } from "@/lib/studySession";

interface Props {
  lastTime?: StudyGoals;
  onStart: (goals: { goal1: string; goal2: string; goal3: string } | null) => void;
}

export function PreStudyModal({ lastTime, onStart }: Props) {
  const { t } = useLanguage();
  const [mainGoal, setMainGoal] = useState("");
  const [showSpecifics, setShowSpecifics] = useState(false);
  const [goal2, setGoal2] = useState("");
  const [goal3, setGoal3] = useState("");

  const submit = () => {
    if (!mainGoal.trim() && !goal2.trim() && !goal3.trim()) { onStart(null); return; }
    onStart({ goal1: mainGoal.trim(), goal2: goal2.trim(), goal3: goal3.trim() });
  };

  const skip = () => onStart(null);

  const lastGoals = lastTime ? [lastTime.goal1, lastTime.goal2, lastTime.goal3].filter(Boolean) : [];

  return (
    <div className="fixed inset-0 z-[90] flex flex-col select-none overflow-y-auto"
      style={{ background: "linear-gradient(160deg, #0d0d1a 0%, #111128 60%, #0a0a14 100%)" }}>
      <div className="flex-1 flex flex-col justify-center px-5 py-12 gap-4 max-w-md mx-auto w-full">

        {/* ── Mrs SchoraHub's speech bubble ── */}
        <div className="flex items-end gap-2.5">
          <div className="shrink-0"><CompanionFace size={44} bob /></div>
          <div className="relative bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex-1">
            <p className="text-[10px] font-bold text-sky-400 mb-0.5">{t("read_companion_name")}</p>
            <p className="text-sm text-white/90 leading-relaxed">{t("read_greeting")}</p>
          </div>
        </div>

        <p className="text-[12px] text-white/40 leading-relaxed pl-1">{t("read_forget_principle")}</p>

        {lastGoals.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5">
            <p className="text-[10px] font-semibold text-white/45 mb-1">{t("read_last_time_goals")}</p>
            <ul className="flex flex-col gap-0.5">
              {lastGoals.map((g, i) => (
                <li key={i} className="text-[12.5px] text-white/70">• {g}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wide text-white/35 pl-1">
            {t("read_goal_open_question")}
          </label>
          <textarea
            value={mainGoal}
            onChange={e => setMainGoal(e.target.value)}
            placeholder={t("read_goal_placeholder_1")}
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-sky-500/60 focus:border-sky-500/40 resize-none"
          />
        </div>

        <button onClick={() => setShowSpecifics(v => !v)}
          className="flex items-center gap-1 text-[12px] text-white/40 self-start pl-1">
          {t("read_intention_headline")}
          {showSpecifics ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showSpecifics && (
          <div className="flex flex-col gap-2 pl-1">
            <input value={goal2} onChange={e => setGoal2(e.target.value)} placeholder={t("read_goal_placeholder_2")}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-sky-500/60" />
            <input value={goal3} onChange={e => setGoal3(e.target.value)} placeholder={t("read_goal_placeholder_3")}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-sky-500/60" />
          </div>
        )}

        <div className="flex flex-col gap-2.5 mt-2">
          <button onClick={submit}
            className="w-full flex items-center justify-center gap-2 text-white text-sm font-semibold py-3.5 rounded-xl active:scale-[0.98] transition-all shadow-md shadow-sky-500/20"
            style={{ background: "linear-gradient(135deg, #0284c7, #3b82f6)" }}>
            {t("read_start_learning")} <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={skip} className="text-center text-[12.5px] text-white/40 py-1">
            {t("read_skip_intention")}
          </button>
        </div>
      </div>
    </div>
  );
}
