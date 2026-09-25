// ============================================================
// components/education/read/ReadSession.tsx
// SchoraHub — Read Section v3.0
// ============================================================
//
// Orchestrates the full 4-step Jim Kwik flow around the existing PDF
// reader: Pre-Study Modal -> Reader View (+ Study Control Bar) -> Break &
// Active Recall -> 2-Pomodoro Reflection. Drop-in replacement for the old
// PdfReaderModal in ResourceDetailModal.tsx — same props, same visual
// language (dark gradient, glass top/bottom bars, sky/blue accents).
//
// PDF loading/rendering goes through lib/pdfEngine.ts, which is what
// makes page turns fast and keeps this working on older browsers (see
// that file's header comment for the full breakdown).

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, FileText, Loader2, ChevronLeft, ChevronRight, AlertCircle,
} from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getReadingProgress, saveReadingProgress, removeReadingProgress } from "@/lib/readingProgress";
import { getPdfDocument, renderPage, prefetchPage, getPageText } from "@/lib/pdfEngine";
import {
  getStudyData, saveGoals, addHighlight, incrementPomodoro, resetPomodoroCount,
  type StudyGoals,
} from "@/lib/studySession";
import { PreStudyModal } from "./PreStudyModal";
import { BreakRecallModal } from "./BreakRecallModal";
import { ReflectionModal } from "./ReflectionModal";
import { StudyToolbar, type ActiveTool } from "./StudyToolbar";
import { PencilPointer } from "./PencilPointer";
import { HighlightLayer } from "./HighlightLayer";
import { NotesPanel } from "./NotesPanel";
import { useAudioReader } from "./useAudioReader";

const FOCUS_SECONDS = 25 * 60;

type Flow = "pre-study" | "reading" | "break" | "reflection";
type LoadState = "loading" | "error" | "ready";

interface Props {
  resource: any;
  onClose: () => void;
  client: SupabaseClient;
  level: string;
}

export function ReadSession({ resource, onClose, client, level }: Props) {
  const [flow, setFlow] = useState<Flow>("pre-study");
  const [goals, setGoals] = useState<StudyGoals | undefined>(() => getStudyData(resource.id).goals);

  // ── PDF loading state ──
  const [state, setState] = useState<LoadState>("loading");
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [doc, setDoc] = useState<any>(null);
  const [page, setPage] = useState(() => {
    const saved = getReadingProgress(resource.id);
    return saved && saved.page > 1 && saved.page < saved.numPages ? saved.page : 1;
  });
  const [total, setTotal] = useState(0);
  const [rendering, setRendering] = useState(true);
  const [showNav, setShowNav] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const renderingRef = useRef(false);
  const navTimerRef = useRef<any>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // ── Study tools state ──
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS);
  const timerRef = useRef<any>(null);

  const pageTextCache = useRef(new Map<number, string>());
  const getCachedPageText = useCallback(async (p: number) => {
    if (pageTextCache.current.has(p)) return pageTextCache.current.get(p)!;
    const text = doc ? await getPageText(doc, p) : "";
    pageTextCache.current.set(p, text);
    return text;
  }, [doc]);

  const audio = useAudioReader(getCachedPageText);

  // ── Step 1: start the flow ──
  const handleStart = (g: { goal1: string; goal2: string; goal3: string }) => {
    const saved = saveGoals(resource.id, g);
    setGoals(saved.goals);
    resetPomodoroCount(resource.id);
    setFlow("reading");
  };

  // ── Load the signed URL, then the document ──
  useEffect(() => {
    client.storage.from("otechy-docs")
      .createSignedUrl(resource.file_url, 3600)
      .then(({ data, error }) => {
        if (error || !data) { setState("error"); return; }
        setSignedUrl(data.signedUrl);
      });
  }, [resource.file_url, client]);

  useEffect(() => {
    if (!signedUrl) return;
    getPdfDocument(signedUrl)
      .then(d => { setDoc(d); setTotal(d.numPages); setState("ready"); })
      .catch(() => setState("error"));
  }, [signedUrl]);

  // ── Render current page (fast-then-sharp, cache-backed) + prefetch neighbours ──
  useEffect(() => {
    if (!doc || !canvasRef.current || flow !== "reading") return;
    if (renderingRef.current) return;
    renderingRef.current = true;
    setRendering(true);
    renderPage(doc, page, canvasRef.current, {
      docUrl: signedUrl!,
      onFirstPaint: () => setRendering(false),
    })
      .catch(() => setState("error"))
      .finally(() => { renderingRef.current = false; });

    const cssWidth = canvasRef.current.parentElement?.clientWidth || window.innerWidth;
    prefetchPage(doc, page + 1, signedUrl!, cssWidth);
    prefetchPage(doc, page - 1, signedUrl!, cssWidth);
  }, [doc, page, signedUrl, flow]);

  // ── Persist reading position ──
  useEffect(() => {
    if (!total) return;
    if (page >= total) { removeReadingProgress(resource.id); return; }
    saveReadingProgress({
      resourceId: resource.id, level, title: resource.title,
      category: resource.category, thumbnailUrl: resource.thumbnail_url,
      page, numPages: total, updatedAt: Date.now(),
    });
  }, [page, total, level, resource]);

  // ── Pomodoro timer — only ticks while actually reading ──
  useEffect(() => {
    if (flow !== "reading") return;
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          const completed = incrementPomodoro(resource.id);
          audio.stop();
          if (completed >= 2) {
            setFlow("reflection");
          } else {
            setPhase("break");
            setFlow("break");
          }
          return FOCUS_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [flow, resource.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { clearInterval(timerRef.current); audio.stop(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resumeAfterBreak = () => {
    setPhase("focus");
    setFlow("reading");
  };

  const finishReflection = (keepReading: boolean) => {
    if (keepReading) {
      resetPomodoroCount(resource.id);
      setPhase("focus");
      setFlow("reading");
    } else {
      onClose();
    }
  };

  // ── Nav ──
  const resetNavTimer = useCallback(() => {
    setShowNav(true);
    clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => setShowNav(false), 3500);
  }, []);
  useEffect(() => { resetNavTimer(); return () => clearTimeout(navTimerRef.current); }, [resetNavTimer]);

  const goTo = (p: number) => {
    if (!total || p < 1 || p > total || renderingRef.current) return;
    if (audio.activePage) audio.stop();
    setPage(p);
    resetNavTimer();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (activeTool === "highlighter") return; // don't hijack text selection gestures
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (activeTool === "highlighter") return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < 45) return;
    if (dx < 0) goTo(page + 1); else goTo(page - 1);
  };
  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === "highlighter") return;
    const x = e.clientX;
    const w = window.innerWidth;
    resetNavTimer();
    if (x < w * 0.33) goTo(page - 1);
    else if (x > w * 0.67) goTo(page + 1);
    else setShowNav(v => !v);
  };

  const toggleTool = (tool: Exclude<ActiveTool, null>) => {
    if (tool === "audio") {
      if (audio.playing) { audio.togglePause(); }
      else if (audio.activePage === page) { audio.togglePause(); }
      else { audio.readPage(page); }
      setActiveTool("audio");
      return;
    }
    audio.stop();
    setActiveTool(prev => (prev === tool ? null : tool));
  };

  if (flow === "pre-study") {
    return <PreStudyModal onStart={handleStart} />;
  }
  if (flow === "break") {
    return <BreakRecallModal goals={goals} onResume={resumeAfterBreak} />;
  }
  if (flow === "reflection") {
    return <ReflectionModal onContinue={() => finishReflection(true)} onFinish={() => finishReflection(false)} />;
  }

  const cssWidth = canvasRef.current?.parentElement?.clientWidth || (typeof window !== "undefined" ? window.innerWidth : 800);
  const progress = total ? (page / total) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col select-none"
      style={{ background: "linear-gradient(160deg, #0d0d1a 0%, #111128 60%, #0a0a14 100%)", touchAction: "pan-y" }}>

      {/* ── Top bar (auto-hides) ── */}
      <div className={`absolute top-0 left-0 right-0 z-20 transition-all duration-300 ease-in-out ${showNav ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)" }}>
          <div className="flex items-center gap-2.5 px-3 pt-10 pb-1">
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/12 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition-transform shrink-0 shadow-lg">
              <X className="w-3.5 h-3.5 text-white" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs text-white/90 truncate leading-tight">{resource.title}</p>
              <p className="text-[9px] text-white/35 mt-0.5">{resource.category}</p>
            </div>
            {total > 0 && (
              <div className="shrink-0 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1">
                <span className="text-[10px] text-white/70 font-mono">{page}<span className="text-white/30">/{total}</span></span>
              </div>
            )}
          </div>
          {state === "ready" && (
            <StudyToolbar
              activeTool={activeTool}
              onToggle={toggleTool}
              audioSupported={audio.supported}
              audioPlaying={audio.playing && audio.activePage === page}
              audioSpeed={audio.speed}
              onAudioSpeedChange={s => audio.changeSpeed(s, page)}
              secondsLeft={secondsLeft}
              phase={phase}
            />
          )}
        </div>
      </div>

      {/* ── Canvas / content area ── */}
      <div ref={stageRef} className="flex-1 overflow-hidden relative"
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onClick={onTap}>

        {state === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <FileText className="w-7 h-7 text-sky-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-sky-600 flex items-center justify-center">
                <Loader2 className="w-3 h-3 animate-spin text-white" />
              </div>
            </div>
            <p className="text-sm text-white/60 font-medium">Opening document</p>
          </div>
        )}

        {state === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-400/60" />
            </div>
            <p className="text-sm text-white/50 font-medium text-center">Could not load document</p>
            <button onClick={onClose}
              className="px-5 py-2 rounded-xl bg-white/10 border border-white/10 text-white/70 text-xs font-semibold active:scale-95 transition-transform">
              Go Back
            </button>
          </div>
        )}

        {state === "ready" && (
          <>
            {rendering && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                  <span className="text-xs text-white/60">Page {page}</span>
                </div>
              </div>
            )}

            <PencilPointer active={activeTool === "pointer"} containerRef={stageRef} />

            <div className="w-full h-full overflow-y-auto">
              <div className="px-1 py-2 relative">
                <div className="rounded-xl overflow-hidden shadow-2xl relative"
                  style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)", opacity: rendering ? 0.5 : 1, transition: "opacity 0.15s ease" }}>
                  <canvas ref={canvasRef} className="w-full block bg-white" />
                  <HighlightLayer
                    doc={doc}
                    pageNum={page}
                    cssWidth={cssWidth}
                    enabled={activeTool === "highlighter"}
                    onHighlight={(text, color) => addHighlight(resource.id, { text, color, page })}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Bottom bar (auto-hides) ── */}
      {state === "ready" && total > 1 && (
        <div className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ease-in-out ${showNav ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
          <div className="px-4 pt-6 pb-8" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.90) 0%, transparent 100%)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] text-white/30 font-mono w-4 text-right shrink-0">1</span>
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: "linear-gradient(to right, #0284c7, #3b82f6)" }} />
              </div>
              <span className="text-[9px] text-white/30 font-mono shrink-0">{total}</span>
            </div>
            <div className="flex items-center justify-between">
              <button onClick={e => { e.stopPropagation(); goTo(page - 1); }} disabled={page <= 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-white/70 text-xs font-semibold disabled:opacity-25 active:scale-95 transition-all shadow-sm">
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <div className="flex flex-col items-center">
                <span className="text-white font-bold text-sm">{page}</span>
                <span className="text-white/30 text-[9px]">of {total}</span>
              </div>
              <button onClick={e => { e.stopPropagation(); goTo(page + 1); }} disabled={page >= total}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold disabled:opacity-25 active:scale-95 transition-all shadow-md"
                style={{ background: "linear-gradient(135deg, #0284c7, #3b82f6)" }}>
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTool === "notes" && <NotesPanel resourceId={resource.id} onClose={() => setActiveTool(null)} />}
    </div>
  );
}
