// Read Section v3.0 — Tool 4: On-Device Local Notes Panel
//
// Cornell Note Method (Cues / Main Notes / Summary), stored entirely via
// studySession.ts (localStorage) — no cloud database. Debounces writes so
// typing doesn't hammer localStorage on every keystroke.

import { useEffect, useRef, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { getStudyData, saveNotes, removeHighlight, type Highlight, type CornellNotes } from "@/lib/studySession";

const COLOR_HEX: Record<Highlight["color"], string> = {
  yellow: "#facc15", green: "#4ade80", pink: "#f472b6", blue: "#60a5fa",
};

interface Props {
  resourceId: string;
  onClose: () => void;
}

export function NotesPanel({ resourceId, onClose }: Props) {
  const { t } = useLanguage();
  const [notes, setNotes] = useState<CornellNotes>({ cues: "", main: "", summary: "" });
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<any>(null);

  useEffect(() => {
    const data = getStudyData(resourceId);
    setNotes(data.notes);
    setHighlights(data.highlights);
  }, [resourceId]);

  const updateField = (field: keyof CornellNotes, value: string) => {
    setNotes(prev => ({ ...prev, [field]: value }));
    setSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveNotes(resourceId, { [field]: value });
      setSaved(true);
    }, 500);
  };

  const deleteHighlight = (id: string) => {
    removeHighlight(resourceId, id);
    setHighlights(prev => prev.filter(h => h.id !== id));
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#0d0d1a]/97 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 pt-10 pb-3 border-b border-white/10 shrink-0">
        <p className="text-sm font-bold text-white">{t("notes_title")}</p>
        <div className="flex items-center gap-2">
          {saved && <span className="text-[10px] text-emerald-400/80">{t("notes_saved")}</span>}
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-white/35">{t("notes_cues")}</label>
          <textarea value={notes.cues} onChange={e => updateField("cues", e.target.value)}
            placeholder={t("notes_cues_placeholder")} rows={2}
            className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-sky-500/60 resize-none" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-white/35">{t("notes_main")}</label>
          <textarea value={notes.main} onChange={e => updateField("main", e.target.value)}
            placeholder={t("notes_main_placeholder")} rows={6}
            className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-sky-500/60 resize-none" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-white/35">{t("notes_summary")}</label>
          <textarea value={notes.summary} onChange={e => updateField("summary", e.target.value)}
            placeholder={t("notes_summary_placeholder")} rows={3}
            className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-sky-500/60 resize-none" />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-white/35">{t("notes_highlights")}</label>
          {highlights.length === 0 ? (
            <p className="text-xs text-white/30 mt-2">{t("notes_empty_highlights")}</p>
          ) : (
            <div className="flex flex-col gap-2 mt-2">
              {highlights.map(h => (
                <div key={h.id} className="flex items-start gap-2 bg-white/5 border border-white/10 rounded-xl p-2.5">
                  <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: COLOR_HEX[h.color] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-white/85 leading-snug">{h.text}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">p. {h.page}</p>
                  </div>
                  <button onClick={() => deleteHighlight(h.id)} className="text-white/30 hover:text-white/60 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
