import { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText, Download, Lock, Star, BadgeCheck,
  Eye, X, Loader2, ChevronLeft, ChevronRight, BookOpen
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const CAT_COLORS: Record<string, string> = {
  "Past Papers": "bg-blue-500/15 text-blue-500 dark:text-blue-400",
  "Textbooks":   "bg-purple-500/15 text-purple-500 dark:text-purple-400",
  "Notes":       "bg-green-500/15 text-green-600 dark:text-green-400",
  "Research":    "bg-orange-500/15 text-orange-500 dark:text-orange-400",
  "Other":       "bg-gray-500/15 text-gray-500 dark:text-gray-400",
};

const CAT_GRADIENTS: Record<string, string> = {
  "Past Papers": "from-blue-600 to-indigo-600",
  "Textbooks":   "from-purple-600 to-violet-600",
  "Notes":       "from-green-500 to-teal-600",
  "Research":    "from-orange-500 to-amber-600",
  "Other":       "from-gray-500 to-slate-600",
};

function formatSize(bytes?: number) {
  if (!bytes) return null;
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

// ── Shared PDF.js singleton ──────────────────────────────────────────────────
let pdfjsLib: any = null;
async function getPdf() {
  if (pdfjsLib) return pdfjsLib;
  const lib = await import("pdfjs-dist");
  lib.GlobalWorkerOptions.workerSrc = workerUrl;
  pdfjsLib = lib;
  return lib;
}

const docCache = new Map<string, any>();
async function getDoc(url: string) {
  if (docCache.has(url)) return docCache.get(url);
  const lib = await getPdf();
  const doc = await lib.getDocument({ url, withCredentials: false }).promise;
  docCache.set(url, doc);
  return doc;
}

async function renderPage(doc: any, pageNum: number, canvas: HTMLCanvasElement) {
  const page = await doc.getPage(pageNum);
  const w = canvas.parentElement?.clientWidth || window.innerWidth;
  const vp = page.getViewport({ scale: 1 });
  const scale = w / vp.width;
  const scaled = page.getViewport({ scale });
  canvas.width = scaled.width;
  canvas.height = scaled.height;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: scaled }).promise;
}

// ── Full-screen PDF reader (same quality as ResourceDetailModal) ─────────────
function PdfReaderModal({ resource, onClose }: { resource: any; onClose: () => void }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [doc,       setDoc]       = useState<any>(null);
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const [rendering, setRendering] = useState(true);
  const [initLoad,  setInitLoad]  = useState(true);
  const [error,     setError]     = useState(false);
  const [showNav,   setShowNav]   = useState(true);

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const renderingRef = useRef(false);
  const navTimerRef  = useRef<any>(null);
  const touchStartX  = useRef(0);
  const touchStartY  = useRef(0);

  const resetNavTimer = useCallback(() => {
    setShowNav(true);
    clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => setShowNav(false), 3500);
  }, []);

  useEffect(() => {
    resetNavTimer();
    return () => clearTimeout(navTimerRef.current);
  }, []);

  useEffect(() => {
    supabase.storage.from("otechy-docs")
      .createSignedUrl(resource.file_url, 3600)
      .then(({ data, error: e }) => {
        if (e || !data) { setError(true); setRendering(false); setInitLoad(false); return; }
        setSignedUrl(data.signedUrl);
      });
  }, [resource.file_url]);

  useEffect(() => {
    if (!signedUrl) return;
    getDoc(signedUrl)
      .then(d => { setDoc(d); setTotal(d.numPages); })
      .catch(() => { setError(true); setRendering(false); setInitLoad(false); });
  }, [signedUrl]);

  useEffect(() => {
    if (!doc || !canvasRef.current) return;
    if (renderingRef.current) return;
    renderingRef.current = true;
    setRendering(true);
    renderPage(doc, page, canvasRef.current)
      .catch(() => setError(true))
      .finally(() => { setRendering(false); setInitLoad(false); renderingRef.current = false; });
  }, [doc, page]);

  const goTo = (p: number) => {
    if (!total || p < 1 || p > total || renderingRef.current) return;
    setPage(p); resetNavTimer();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < 45) return;
    if (dx < 0) goTo(page + 1); else goTo(page - 1);
  };
  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const x = e.clientX; const w = window.innerWidth;
    resetNavTimer();
    if (x < w * 0.33) goTo(page - 1);
    else if (x > w * 0.67) goTo(page + 1);
    else { setShowNav(v => !v); clearTimeout(navTimerRef.current); }
  };

  const progress = total ? (page / total) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col select-none"
      style={{ background: "linear-gradient(160deg,#0d0d1a 0%,#111128 60%,#0a0a14 100%)", touchAction: "pan-y" }}>

      {/* Top bar */}
      <div className={`absolute top-0 left-0 right-0 z-20 transition-all duration-300 ${showNav ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="flex items-center gap-2.5 px-3 pt-10 pb-5"
          style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.85) 0%,transparent 100%)" }}>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/12 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition-transform shrink-0">
            <X className="w-3.5 h-3.5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs text-white/90 truncate">{resource.title}</p>
            <p className="text-[9px] text-white/35">{resource.category}</p>
          </div>
          {total > 0 && (
            <div className="shrink-0 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1">
              <span className="text-[10px] text-white/70 font-mono">{page}<span className="text-white/30">/{total}</span></span>
            </div>
          )}
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-hidden relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onClick={onTap}>
        {initLoad && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <FileText className="w-7 h-7 text-purple-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                <Loader2 className="w-3 h-3 animate-spin text-white" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-white/60 font-medium">Opening document</p>
              <p className="text-[10px] text-white/25 mt-1">{resource.file_name}</p>
            </div>
          </div>
        )}
        {rendering && !initLoad && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              <span className="text-xs text-white/60">Page {page}</span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <FileText className="w-7 h-7 text-red-400/60" />
            </div>
            <p className="text-sm text-white/50 font-medium text-center">Could not load document</p>
            <button onClick={onClose} className="px-5 py-2 rounded-xl bg-white/10 border border-white/10 text-white/70 text-xs font-semibold">Go Back</button>
          </div>
        )}
        {showNav && doc && !rendering && !initLoad && (
          <>
            {page > 1 && (
              <div className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-start pl-2 pointer-events-none">
                <div className="w-7 h-14 rounded-r-xl bg-white/5 border-r border-y border-white/8 flex items-center justify-center">
                  <ChevronLeft className="w-4 h-4 text-white/30" />
                </div>
              </div>
            )}
            {page < total && (
              <div className="absolute right-0 top-0 bottom-0 w-14 flex items-center justify-end pr-2 pointer-events-none">
                <div className="w-7 h-14 rounded-l-xl bg-white/5 border-l border-y border-white/8 flex items-center justify-center">
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>
              </div>
            )}
          </>
        )}
        <div className="w-full h-full overflow-y-auto">
          <div className="px-1 py-2">
            <div className="rounded-xl overflow-hidden shadow-2xl"
              style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.04)", opacity: initLoad ? 0 : rendering ? 0.4 : 1, transition: "opacity 0.2s ease" }}>
              <canvas ref={canvasRef} className="w-full block bg-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ${showNav ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
        <div className="px-4 pt-6 pb-8" style={{ background: "linear-gradient(to top,rgba(0,0,0,0.90) 0%,transparent 100%)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[9px] text-white/30 font-mono w-4 text-right shrink-0">1</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: "linear-gradient(to right,#7c3aed,#3b82f6)" }} />
            </div>
            <span className="text-[9px] text-white/30 font-mono shrink-0">{total}</span>
          </div>
          {total > 0 && total <= 10 ? (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: total }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={e => { e.stopPropagation(); goTo(p); }}
                  className={`rounded-full transition-all duration-200 active:scale-90 ${p === page ? "w-5 h-2.5 bg-purple-400 shadow-sm shadow-purple-500/50" : "w-2 h-2 bg-white/20"}`} />
              ))}
            </div>
          ) : total > 10 ? (
            <div className="flex items-center justify-between">
              <button onClick={e => { e.stopPropagation(); goTo(page - 1); }} disabled={page <= 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-white/70 text-xs font-semibold disabled:opacity-25 active:scale-95 transition-all">
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <div className="flex flex-col items-center">
                <span className="text-white font-bold text-sm">{page}</span>
                <span className="text-white/30 text-[9px]">of {total}</span>
              </div>
              <button onClick={e => { e.stopPropagation(); goTo(page + 1); }} disabled={page >= total}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold disabled:opacity-25 active:scale-95 transition-all shadow-md"
                style={{ background: "linear-gradient(135deg,#7c3aed,#3b82f6)" }}>
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Resource Card ────────────────────────────────────────────────────────────
interface Props {
  resource: any;
  isPurchased: boolean;
  onBuy: (r: any) => void;
  onDownload: (r: any) => void;
  onOpen: (r: any) => void;
}

export function ResourceCard({ resource, isPurchased, onBuy, onDownload, onOpen }: Props) {
  const [showReader,  setShowReader]  = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  const isFree    = !resource.price || Number(resource.price) === 0;
  const canAccess = isFree || isPurchased;
  const size      = formatSize(resource.file_size);
  const hasRating = resource.review_count > 0;
  const isPdf     = resource.file_name?.toLowerCase().endsWith(".pdf");
  const showThumb = !!resource.thumbnail_url && !thumbFailed;
  const grad      = CAT_GRADIENTS[resource.category] ?? CAT_GRADIENTS["Other"];

  return (
    <>
      <div
        onClick={() => onOpen(resource)}
        className="group relative flex flex-col bg-card border border-border rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-150 cursor-pointer"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      >
        {/* ── Cover area ── */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/4", maxHeight: 200 }}>

          {showThumb ? (
            <img
              src={resource.thumbnail_url}
              alt={resource.title}
              className="w-full h-full object-cover object-top"
              onError={() => setThumbFailed(true)}
            />
          ) : (
            /* No thumbnail — rich placeholder */
            <div className={`w-full h-full bg-gradient-to-br ${grad} flex flex-col items-center justify-center gap-3 p-4`}>
              <div className="w-14 h-16 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <p className="text-white/80 text-[10px] font-semibold text-center leading-tight line-clamp-3 px-1">
                {resource.title}
              </p>
            </div>
          )}

          {/* Top badges */}
          <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm bg-white/90 dark:bg-black/60 ${CAT_COLORS[resource.category] ?? CAT_COLORS["Other"]}`}>
              {resource.category}
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
              isFree
                ? "bg-emerald-500 text-white"
                : isPurchased
                ? "bg-blue-500 text-white"
                : "bg-orange-500 text-white"
            }`}>
              {isFree ? "FREE" : isPurchased ? "OWNED" : `MK ${Number(resource.price).toLocaleString()}`}
            </span>
          </div>

          {/* Read button — bottom right */}
          {isPdf && (
            <button
              onClick={e => { e.stopPropagation(); setShowReader(true); }}
              className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full text-white active:scale-90 transition-transform shadow-md"
              style={{ background: "linear-gradient(135deg,#7c3aed,#3b82f6)" }}
            >
              <Eye className="w-3 h-3" /> Read
            </button>
          )}

          {/* Bottom gradient fade for readability */}
          <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
            style={{ background: "linear-gradient(to top,rgba(0,0,0,0.3) 0%,transparent 100%)" }} />
        </div>

        {/* ── Card body ── */}
        <div className="p-2.5 flex flex-col gap-2 flex-1">
          <h3 className="font-bold text-xs text-foreground line-clamp-2 leading-snug">{resource.title}</h3>

          {resource.uploader_verified && (
            <div className="flex items-center gap-1">
              <BadgeCheck className="w-3 h-3 text-blue-400" />
              <span className="text-[9px] text-blue-400 font-semibold">Verified</span>
            </div>
          )}

          {/* Rating */}
          {hasRating ? (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-[10px] font-bold text-foreground">{Number(resource.avg_rating).toFixed(1)}</span>
              <span className="text-[9px] text-muted-foreground">({resource.review_count})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-muted-foreground/40" />
              <span className="text-[9px] text-muted-foreground/50">No reviews yet</span>
            </div>
          )}

          {/* Downloads + size */}
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
            <Download className="w-2.5 h-2.5" />
            <span>{resource.download_count > 0 ? resource.download_count : "0"} downloads</span>
            {size && <><span className="opacity-30">·</span><span>{size}</span></>}
          </div>

          {/* CTA button */}
          <div className="mt-auto pt-1">
            {canAccess ? (
              <button
                onClick={e => { e.stopPropagation(); onDownload(resource); }}
                className="w-full flex items-center justify-center gap-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[10px] font-bold py-2 rounded-lg active:scale-[0.98] transition-all shadow-sm shadow-purple-500/20"
              >
                <Download className="w-3 h-3" /> Download
              </button>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); onBuy(resource); }}
                className="w-full flex items-center justify-center gap-1 bg-gradient-to-r from-orange-500 to-pink-600 text-white text-[10px] font-bold py-2 rounded-lg active:scale-[0.98] transition-all shadow-sm shadow-orange-500/20"
              >
                <Lock className="w-3 h-3" /> Buy
              </button>
            )}
          </div>
        </div>
      </div>

      {showReader && <PdfReaderModal resource={resource} onClose={() => setShowReader(false)} />}
    </>
  );
}
