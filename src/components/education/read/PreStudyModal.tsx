// Read Section v3.0 — Step 1: Pre-Study Modal ("Jim Kwik Primer")
//
// Full-screen, must-complete-before-reading overlay. Saves the 3 intention
// goals locally (studySession.ts) and hands them back up so the Break &
// Active Recall step (Step 3) can quote them back to the learner.

import { useState } from "react";
import { BrainCircuit, ArrowRight } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface Props {
  onStart: (goals: { goal1: string; goal2: string; goal3: string }) => void;
}

export function PreStudyModal({ onStart }: Props) {
  const { t } = useLanguage();
  const [goal1, setGoal1] = useState("");
  const [goal2, setGoal2] = useState("");
  const [goal3, setGoal3] = useState("");
  const [showError, setShowError] = useState(false);

  const allFilled = goal1.trim() && goal2.trim() && goal3.trim();

  const submit = () => {
    if (!allFilled) { setShowError(true); return; }
    onStart({ goal1: goal1.trim(), goal2: goal2.trim(), goal3: goal3.trim() });
  };

  const fields = [
    { value: goal1, set: setGoal1, placeholder: t("read_goal_placeholder_1"), n: 1 },
    { value: goal2, set: setGoal2, placeholder: t("read_goal_placeholder_2"), n: 2 },
    { value: goal3, set: setGoal3, placeholder: t("read_goal_placeholder_3"), n: 3 },
  ];

  return (
    <div className="fixed inset-0 z-[90] flex flex-col select-none overflow-y-auto"
      style={{ background: "linear-gradient(160deg, #0d0d1a 0%, #111128 60%, #0a0a14 100%)" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 gap-6 max-w-md mx-auto w-full">

        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
          <BrainCircuit className="w-7 h-7 text-sky-400" />
        </div>

        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-400 mb-2">{t("read_pre_study_title")}</p>
          <p className="text-sm text-white/70 leading-relaxed">{t("read_forget_principle")}</p>
        </div>

        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-white/90 leading-snug">{t("read_intention_headline")}</p>

          {fields.map(f => (
            <div key={f.n} className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-white/35">
                {t("read_goal_label", { n: f.n })}
              </label>
              <input
                value={f.value}
                onChange={e => { f.set(e.target.value); setShowError(false); }}
                placeholder={f.placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-sky-500/60 focus:border-sky-500/40"
              />
            </div>
          ))}

          {showError && (
            <p className="text-[11px] text-orange-400 font-medium">{t("read_goals_required")}</p>
          )}
        </div>

        <button onClick={submit}
          className="w-full flex items-center justify-center gap-2 text-white text-sm font-semibold py-3.5 rounded-xl active:scale-[0.98] transition-all shadow-md shadow-sky-500/20"
          style={{ background: "linear-gradient(135deg, #0284c7, #3b82f6)" }}>
          {t("read_start_learning")} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
