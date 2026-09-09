import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X, Download, FileText, Calendar, BookOpen, Loader2,
  ChevronLeft, ChevronRight, Eye, Share2, Trash2, Building2,
} from "lucide-react";
import type { EducationFile } from "@/lib/educationFiles";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

function formatSize(bytes?: number) {
  if (!bytes) return null;
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

// ── Shared PDF.js singleton (mirrors the one in UniversitiesTab / ResourceDetailModal) ──
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

// ── Full-screen reader (same visual language as ResourceDetailModal's) ──
function PdfReaderModal({ file, onClose }: { file: EducationFile; onClose: () => void }) {
  const [doc, setDoc] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rendering, setRendering] = useState(true);
  const [initLoad, setInitLoad] = useState(true);
  const [error, setError] = useState(false);
  const [showNav, setShowNav] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderingRef = useRef(false);
  const navTimerRef = useRef<any>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const resetNavTimer = useCallback(() => {
    setShowNav(true);
    clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => setShowNav(false), 3500);
  }, []);

  useEffect(() => { resetNavTimer(); return () => clearTimeout(navTimerRef.current); }, []);

  useEffect(() => {
    getDoc(file.file_url)
      .then(d => { setDoc(d); setTotal(d.numPages); })
      .catch(() => { setError(true); setRendering(false); setInitLoad(false); });
  }, [file.file_url]);

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
    <div className="fixed inset-0 z-[80] flex flex-col select-none"
      style={{ background: "linear-gradient(160deg,#0d0d1a 0%,#111128 60%,#0a0a14 100%)", touchAction: "pan-y" }}>
      <div className={`absolute top-0 left-0 right-0 z-20 transition-all duration-300 ${showNav ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="flex items-center gap-2.5 px-3 pt-10 pb-5"
          style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.85) 0%,transparent 100%)" }}>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/12 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition-transform shrink-0">
            <X className="w-3.5 h-3.5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs text-white/90 truncate">{file.title}</p>
            <p className="text-[9px] text-white/35">{file.category}</p>
          </div>
          {total > 0 && (
            <div className="shrink-0 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1">
              <span className="text-[10px] text-white/70 font-mono">{page}<span className="text-white/30">/{total}</span></span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onClick={onTap}>
        {initLoad && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <FileText className="w-7 h-7 text-sky-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-sky-600 flex items-center justify-center">
                <Loader2 className="w-3 h-3 animate-spin text-white" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-white/60 font-medium">Opening document</p>
              <p className="text-[10px] text-white/25 mt-1">{file.title}</p>
            </div>
          </div>
        )}
        {rendering && !initLoad && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
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

      <div className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ${showNav ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
        <div className="px-4 pt-6 pb-8" style={{ background: "linear-gradient(to top,rgba(0,0,0,0.90) 0%,transparent 100%)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[9px] text-white/30 font-mono w-4 text-right shrink-0">1</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: "linear-gradient(to right,#0284c7,#3b82f6)" }} />
            </div>
            <span className="text-[9px] text-white/30 font-mono shrink-0">{total}</span>
          </div>
          {total > 0 && total <= 10 ? (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: total }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={e => { e.stopPropagation(); goTo(p); }}
                  className={`rounded-full transition-all duration-200 active:scale-90 ${p === page ? "w-5 h-2.5 bg-sky-400 shadow-sm shadow-sky-500/50" : "w-2 h-2 bg-white/20"}`} />
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
                style={{ background: "linear-gradient(135deg,#0284c7,#3b82f6)" }}>
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Compact first-page preview inside the modal body ──
function PdfPreview({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getDoc(url)
      .then(d => d.getPage(1).then(() => d))
      .then(d => canvasRef.current && renderPage(d, 1, canvasRef.current))
      .then(() => setLoading(false))
      .catch(() => { setError(true); setLoading(false); });
  }, [url]);

  if (error) return (
    <div className="h-28 bg-muted/20 rounded-xl flex flex-col items-center justify-center gap-1.5">
      <FileText className="w-6 h-6 text-muted-foreground" />
      <p className="text-[11px] text-muted-foreground">Preview unavailable</p>
    </div>
  );

  return (
    <div className="relative rounded-xl overflow-hidden border border-border bg-white dark:bg-gray-900">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10">
          <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
        </div>
      )}
      <canvas ref={canvasRef} className="w-full block" style={{ opacity: loading ? 0 : 1 }} />
    </div>
  );
}

// ── Main modal ──
interface Props {
  file: EducationFile;
  universityName: string;
  currentUserId: string | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function EducationFileDetailModal({ file, universityName, currentUserId, onClose, onDelete }: Props) {
  const [showReader, setShowReader] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isPdf = file.file_type === "pdf";
  const size = formatSize((file as any).file_size);

  // Same assumption as EducationFileCard: needs an `uploader_id` column set to
  // the uploader's auth user id. Falls back to "no one can delete" if absent.
  const isOwner = !!currentUserId && !!(file as any).uploader_id && (file as any).uploader_id === currentUserId;

  const handleDelete = async () => {
    if (!confirm(`Remove "${file.title}"?`)) return;
    setDeleting(true);
    try {
      const { deleteEducationFile } = await import("@/lib/educationFiles");
      await deleteEducationFile(file.id);
      onDelete(file.id);
    } catch (err: any) {
      alert(err.message ?? "Failed to delete");
      setDeleting(false);
    }
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="w-full max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
          style={{ height: "90vh", maxHeight: "90vh" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border shrink-0">
            <div className="flex-1 min-w-0">
              <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-500 dark:text-sky-400 mb-1">
                {file.category}
              </span>
              <h2 className="font-bold text-sm text-foreground leading-snug line-clamp-2">{file.title}</h2>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={async () => {
                  const shareData = { title: file.title, text: `Check out "${file.title}" on SchoraHub 👇\nhttps://schorahub.vercel.app` };
                  try {
                    if (navigator.share) await navigator.share(shareData);
                    else await navigator.clipboard.writeText(shareData.text);
                  } catch { /* cancelled */ }
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                <Share2 className="w-3.5 h-3.5" />
              </button>
              {isOwner && (
                <button onClick={handleDelete} disabled={deleting}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              )}
              <button onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="px-4 py-3 flex flex-col gap-4">
              <div className="flex items-center gap-2.5 bg-muted/30 rounded-xl p-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{universityName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{file.program}</p>
                </div>
              </div>

              {(file as any).uploaded_by && (
                <p className="text-[10px] text-muted-foreground">
                  Uploaded by <span className="font-semibold text-foreground">{(file as any).uploaded_by}</span>
                </p>
              )}

              <div className="flex flex-wrap gap-1.5">
                {size ? (
                  <div className="flex items-center gap-1 bg-muted/40 rounded-lg px-2 py-1">
                    <FileText className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{size}</span>
                  </div>
                ) : null}
                {(file as any).created_at && (
                  <div className="flex items-center gap-1 bg-muted/40 rounded-lg px-2 py-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {new Date((file as any).created_at).toLocaleDateString("en-MW", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                )}
              </div>

              {isPdf && (
                <div>
                  <p className="text-[10px] font-bold text-foreground uppercase tracking-wide mb-1.5">Preview</p>
                  <PdfPreview url={file.file_url} />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border bg-card shrink-0">
            <div className="flex gap-2">
              {isPdf && (
                <button onClick={() => setShowReader(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-muted border border-border text-foreground text-xs font-semibold py-2.5 rounded-xl active:scale-[0.97] transition-all">
                  <Eye className="w-3.5 h-3.5" /> Read
                </button>
              )}
              <a href={file.file_url} target="_blank" rel="noopener noreferrer" onClick={onClose}
                className={`flex items-center justify-center gap-1.5 bg-gradient-to-r from-sky-600 to-blue-600 text-white text-xs font-semibold py-2.5 rounded-xl active:scale-[0.97] transition-all shadow-md shadow-sky-500/20 ${isPdf ? "flex-1" : "w-full"}`}>
                <Download className="w-3.5 h-3.5" /> Open
              </a>
            </div>
          </div>
        </div>
      </div>

      {showReader && <PdfReaderModal file={file} onClose={() => setShowReader(false)} />}
    </>,
    document.body
  );
}
