// Read Section v3.0 — Step 3: Break & Active Recall
//
// Fires when the 25-minute focus block ends. Shows a 5-minute countdown
// and re-displays the learner's own Step-1 goals as Active Recall prompts.

import { useEffect, useState } from "react";
import { Coffee, Play } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import type { StudyGoals } from "@/lib/studySession";

const BREAK_SECONDS = 5 * 60;

interface Props {
  goals: StudyGoals | undefined;
  onResume: () => void;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function BreakRecallModal({ goals, onResume }: Props) {
  const { t } = useLanguage();
  const [secondsLeft, setSecondsLeft] = useState(BREAK_SECONDS);

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const goalList = goals ? [goals.goal1, goals.goal2, goals.goal3] : [];

  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center select-none px-5"
      style={{ background: "linear-gradient(160deg, #0d0d1a 0%, #111128 60%, #0a0a14 100%)" }}>
      <div className="w-full max-w-md flex flex-col items-center gap-5">

        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Coffee className="w-7 h-7 text-emerald-400" />
        </div>

        <div className="text-center">
          <p className="text-lg font-bold text-white">{t("break_title")}</p>
          <p className="text-sm text-white/50 mt-0.5">{t("break_subtitle")}</p>
        </div>

        <div className="text-4xl font-black font-mono text-emerald-400 tabular-nums">{fmt(secondsLeft)}</div>

        {goalList.length > 0 && (
          <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5">
            <p className="text-sm font-semibold text-white/90">{t("break_recall_title")}</p>
            <p className="text-xs text-white/55 leading-relaxed">{t("break_recall_prompt")}</p>
            <ul className="flex flex-col gap-1.5 mt-1">
              {goalList.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-white/85">
                  <span className="text-sky-400 font-bold shrink-0">{i + 1}.</span> {g}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button onClick={onResume}
          className="w-full flex items-center justify-center gap-2 text-white text-sm font-semibold py-3.5 rounded-xl active:scale-[0.98] transition-all shadow-md shadow-sky-500/20"
          style={{ background: "linear-gradient(135deg, #0284c7, #3b82f6)" }}>
          <Play className="w-4 h-4" /> {t("break_resume")}
        </button>
      </div>
    </div>
  );
}
