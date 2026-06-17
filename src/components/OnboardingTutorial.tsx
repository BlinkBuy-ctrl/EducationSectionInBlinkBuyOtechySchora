import { useState } from "react";
import {
  Upload, BookOpen, Award, Users,
  BarChart2, ArrowRight, X, CheckCircle2,
} from "lucide-react";

interface Props {
  onDone: () => void;
  onUpload: () => void;
}

const STEPS = [
  {
    emoji: "👋",
    title: "Welcome to OtechySchora!",
    desc: "Malawi's #1 education hub — past papers, textbooks, scholarships, and tutors all in one place. No account needed.",
    icon: BookOpen,
    color: "from-purple-500 to-blue-600",
    cta: null,
  },
  {
    emoji: "📚",
    title: "Browse & Download",
    desc: "Tap any resource card to preview it. Free resources download instantly. Paid ones unlock after purchase.",
    icon: BookOpen,
    color: "from-blue-500 to-cyan-500",
    cta: null,
  },
  {
    emoji: "⬆️",
    title: "Upload & Earn",
    desc: "Share your notes, past papers or textbooks. Set a price or give for free. Your account is created automatically when you upload — no sign-up form.",
    icon: Upload,
    color: "from-purple-500 to-pink-500",
    cta: null,
  },
  {
    emoji: "🏆",
    title: "Scholarships & Tutors",
    desc: "Find scholarships from Malawi and beyond. Connect with verified tutors for MSCE, university, and professional courses.",
    icon: Award,
    color: "from-yellow-500 to-orange-500",
    cta: null,
  },
  {
    emoji: "📊",
    title: "Track Your Stats",
    desc: "See your downloads, earnings, and uploads in My Stats. Tap the chart icon in the bottom nav anytime.",
    icon: BarChart2,
    color: "from-green-500 to-emerald-500",
    cta: "Upload your first resource",
  },
];

export function OnboardingTutorial({ onDone, onUpload }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-sm bg-card border border-border rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">

        {/* Progress dots */}
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-6 bg-purple-500"
                    : i < step
                    ? "w-3 bg-purple-400/60"
                    : "w-3 bg-muted"
                }`}
              />
            ))}
          </div>
          <button
            onClick={onDone}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 flex flex-col items-center text-center gap-4">
          {/* Icon bubble */}
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center shadow-lg text-4xl`}>
            {current.emoji}
          </div>

          <div>
            <h2 className="text-xl font-black text-foreground mb-2 leading-tight">{current.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{current.desc}</p>
          </div>

          {/* Buttons */}
          <div className="w-full flex flex-col gap-2 mt-2">
            {isLast ? (
              <>
                <button
                  onClick={onUpload}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3.5 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-purple-500/30"
                >
                  <Upload className="w-4 h-4" /> Upload your first resource
                </button>
                <button
                  onClick={onDone}
                  className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground py-2 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" /> I'll explore first
                </button>
              </>
            ) : (
              <button
                onClick={() => setStep(s => s + 1)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3.5 rounded-2xl active:scale-[0.98] transition-all"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Step counter */}
        <p className="text-center text-[11px] text-muted-foreground pb-5">
          {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
