// Read Section v3.0 — Study Control Bar
//
// Sits under the existing top header (title/close/page count already
// live there in the reader) and exposes the 4 reading tools plus the
// running Pomodoro clock.

import { MousePointer2, Volume2, Pause, Highlighter, NotebookPen, Timer } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import type { AudioSpeed } from "./useAudioReader";

export type ActiveTool = "pointer" | "audio" | "highlighter" | "notes" | null;

interface Props {
  activeTool: ActiveTool;
  onToggle: (tool: Exclude<ActiveTool, null>) => void;
  audioSupported: boolean;
  audioPlaying: boolean;
  audioSpeed: AudioSpeed;
  onAudioSpeedChange: (s: AudioSpeed) => void;
  secondsLeft: number;
  phase: "focus" | "break";
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const SPEEDS: AudioSpeed[] = [1, 1.25, 1.5];

export function StudyToolbar({ activeTool, onToggle, audioSupported, audioPlaying, audioSpeed, onAudioSpeedChange, secondsLeft, phase }: Props) {
  const { t } = useLanguage();

  const tools: { id: Exclude<ActiveTool, null>; icon: any; label: string; disabled?: boolean }[] = [
    { id: "pointer", icon: MousePointer2, label: t("tool_pencil_pointer") },
    { id: "audio", icon: audioPlaying ? Pause : Volume2, label: t("tool_audio_reader"), disabled: !audioSupported },
    { id: "highlighter", icon: Highlighter, label: t("tool_highlighter") },
    { id: "notes", icon: NotebookPen, label: t("tool_notes") },
  ];

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1.5 shrink-0">
        <Timer className={`w-3 h-3 ${phase === "break" ? "text-emerald-400" : "text-sky-400"}`} />
        <span className="text-[11px] font-mono font-semibold text-white/90">{fmt(secondsLeft)}</span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1">
        {tools.map(tool => (
          <button key={tool.id} disabled={tool.disabled}
            onClick={() => onToggle(tool.id)}
            title={tool.label}
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all active:scale-90 disabled:opacity-25 ${
              activeTool === tool.id
                ? "bg-sky-500/25 border-sky-400/40 text-sky-300"
                : "bg-white/8 border-white/10 text-white/60"
            }`}>
            <tool.icon className="w-3.5 h-3.5" />
          </button>
        ))}

        {activeTool === "audio" && audioSupported && (
          <div className="flex items-center gap-1 ml-1 bg-white/8 border border-white/10 rounded-full px-1.5 py-1 shrink-0">
            {SPEEDS.map(s => (
              <button key={s} onClick={() => onAudioSpeedChange(s)}
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition-colors ${
                  audioSpeed === s ? "bg-sky-500/30 text-sky-300" : "text-white/40"
                }`}>
                {s}x
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
