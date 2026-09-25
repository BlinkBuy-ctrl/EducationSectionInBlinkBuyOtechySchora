// Read Section v3.0 — Step 4: 2-Pomodoro Reflection & Community
//
// Triggers after two completed 25-minute focus blocks (50 minutes total).

import { useState } from "react";
import { Star } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { CompanionFace } from "./CompanionFace";

interface Props {
  onContinue: () => void;
  onFinish: () => void;
}

export function ReflectionModal({ onContinue, onFinish }: Props) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  const tips = [t("reflection_tip_water"), t("reflection_tip_walk"), t("reflection_tip_feynman")];

  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center select-none px-5"
      style={{ background: "linear-gradient(160deg, #0d0d1a 0%, #111128 60%, #0a0a14 100%)" }}>
      <div className="w-full max-w-md flex flex-col items-center gap-5">

        <CompanionFace size={52} bob />

        <div className="text-center">
          <p className="text-lg font-bold text-white">{t("reflection_title")}</p>
          <p className="text-sm text-white/50 mt-0.5">{t("reflection_subtitle")}</p>
        </div>

        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-3">
          <p className="text-sm text-white/85 text-center leading-relaxed">{t("reflection_confidence_q")}</p>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setRating(s)}
                onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}>
                <Star className={`w-7 h-7 transition-colors ${(hover || rating) >= s ? "fill-yellow-400 text-yellow-400" : "text-white/20"}`} />
              </button>
            ))}
          </div>
        </div>

        <p className="text-[13px] text-emerald-300/90 text-center leading-relaxed px-2">{t("reflection_encouragement")}</p>

        <div className="w-full flex flex-col gap-1.5">
          {tips.map((tip, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[13px] text-white/75">
              {tip}
            </div>
          ))}
        </div>

        <div className="w-full flex gap-2">
          <button onClick={onFinish}
            className="flex-1 bg-white/10 border border-white/10 text-white/70 text-xs font-semibold py-3 rounded-xl active:scale-[0.97] transition-all">
            {t("reflection_finish")}
          </button>
          <button onClick={onContinue}
            className="flex-1 text-white text-xs font-semibold py-3 rounded-xl active:scale-[0.97] transition-all shadow-md shadow-sky-500/20"
            style={{ background: "linear-gradient(135deg, #0284c7, #3b82f6)" }}>
            {t("reflection_continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
