import { useState, useEffect, useRef, useContext, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X, Download, Lock, Star, FileText,
  User, Calendar, BookOpen, Bookmark, BookmarkCheck,
  ChevronLeft, ChevronRight, Loader2, CheckCircle2, BadgeCheck, Eye
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthContext } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const CAT_COLORS: Record<string, string> = {
  "Past Papers": "bg-blue-500/15 text-blue-400",
  "Textbooks":   "bg-purple-500/15 text-purple-400",
  "Notes":       "bg-green-500/15 text-green-400",
  "Research":    "bg-orange-500/15 text-orange-400",
  "Other":       "bg-gray-500/15 text-gray-400",
};

function formatSize(bytes?: number) {
  if (!bytes) return null;
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

function StarRating({ value, onChange, readonly = false }: {
  value: number; onChange?: (v: number) => void; readonly?: boolean;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button" disabled={readonly}
          onClick={() => onChange?.(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={readonly ? "cursor-default" : "cursor-pointer"}>
          <Star className={`w-4 h-4 transition-colors ${(hover || value) >= s ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}

// ── Global PDF.js singleton — init once, reuse everywhere ───────────────────
let pdfjsInstance: any = null;
async function getPdfjsLib() {
  if (pdfjsInstance) return pdfjsInstance;
  const lib = await import("pdfjs-dist");
  lib.GlobalWorkerOptions.workerSrc = workerUrl;
  pdfjsInstance = lib;
  return lib;
}

// ── Cache loaded PDF docs by URL so re-opens are instant ───────────────────
const docCache = new Map<string, any>();
async function getDoc(url: string) {
  if (docCache.has(url)) return docCache.get(url);
  const lib = await getPdfjsLib();
  const doc = await lib.getDocument({ url, withCredentials: false }).promise;
  docCache.set(url, doc);
  return doc;
}

// ── Render a page onto a canvas, returns height ─────────────────────────────
async function renderPage(doc: any, pageNum: number, canvas: HTMLCanvasElement) {
  const page = await doc.getPage(pageNum);
  const w = canvas.parentElement?.clientWidth || window.innerWidth;
  const vp = page.getViewport({ scale: 1 });
  const scale = w / vp.width;
  const scaled = page.getViewport({ scale });
  canvas.width  = scaled.width;
  canvas.height = scaled.height;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const task = page.render({ canvasContext: ctx, viewport: scaled });
  await task.promise;
}

// ── Full-screen reader ───────────────────────────────────────────────────────
function PdfReaderModal({ resource, onClose }: { resource: any; onClose: () => void }) {
  const [signedUrl,  setSignedUrl]  = useState<string | null>(null);
  const [doc,        setDoc]        = useState<any>(null);
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [rendering,  setRendering]  = useState(true);
  const [initLoad,   setInitLoad]   = useState(true);
  const [error,      setError]      = useState(false);
  const [showNav,    setShowNav]    = useState(true);
  const [flipDir,    setFlipDir]    = useState<"left"|"right"|null>(null);

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
      .finally(() => {
        setRendering(false);
        setInitLoad(false);
        renderingRef.current = false;
        setFlipDir(null);
      });
  }, [doc, page]);

  const goTo = (p: number, dir?: "left"|"right") => {
    if (!total || p < 1 || p > total || renderingRef.current) return;
    setFlipDir(dir ?? null);
    setPage(p);
    resetNavTimer();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < 45) return;
    if (dx < 0) goTo(page + 1, "left");
    else         goTo(page - 1, "right");
  };

  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const x = e.clientX;
    const w = window.innerWidth;
    resetNavTimer();
    if (x < w * 0.33)       goTo(page - 1, "right");
    else if (x > w * 0.67)  goTo(page + 1, "left");
    else { setShowNav(v => !v); clearTimeout(navTimerRef.current); }
  };

  const progress = total ? (page / total) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col select-none"
      style={{ background: "linear-gradient(160deg, #0d0d1a 0%, #111128 60%, #0a0a14 100%)", touchAction: "pan-y" }}>

      {/* ── Top bar (auto-hides) ── */}
      <div className={`absolute top-0 left-0 right-0 z-20 transition-all duration-300 ease-in-out ${showNav ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="flex items-center gap-2.5 px-3 pt-10 pb-5"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)" }}>
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
      </div>

      {/* ── Canvas / content area ── */}
      <div className="flex-1 overflow-hidden relative"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={onTap}>

        {/* Initial loading state */}
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

        {/* Page-turning loading overlay */}
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
            <div className="text-center">
              <p className="text-sm text-white/50 font-medium">Could not load document</p>
              <p className="text-[10px] text-white/25 mt-1">Check your connection and try again</p>
            </div>
            <button onClick={onClose}
              className="px-5 py-2 rounded-xl bg-white/10 border border-white/10 text-white/70 text-xs font-semibold active:scale-95 transition-transform">
              Go Back
            </button>
          </div>
        )}

        {/* Tap zone hints */}
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

        {/* Page canvas */}
        <div className="w-full h-full overflow-y-auto">
          <div className="px-1 py-2">
            <div className="rounded-xl overflow-hidden shadow-2xl"
              style={{
                boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
                opacity: initLoad ? 0 : rendering ? 0.4 : 1,
                transition: "opacity 0.2s ease",
              }}>
              <canvas ref={canvasRef} className="w-full block bg-white" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar (auto-hides) ── */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ease-in-out ${showNav ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
        <div className="px-4 pt-6 pb-8"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.90) 0%, transparent 100%)" }}>

          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[9px] text-white/30 font-mono w-4 text-right shrink-0">1</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(to right, #7c3aed, #3b82f6)",
                }} />
            </div>
            <span className="text-[9px] text-white/30 font-mono shrink-0">{total}</span>
          </div>

          {/* Page dots (≤10 pages) or prev/next buttons */}
          {total > 0 && total <= 10 ? (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: total }, (_, i) => i + 1).map(p => (
                <button key={p}
                  onClick={e => { e.stopPropagation(); goTo(p); }}
                  className={`rounded-full transition-all duration-200 active:scale-90 ${
                    p === page
                      ? "w-5 h-2.5 bg-purple-400 shadow-sm shadow-purple-500/50"
                      : "w-2 h-2 bg-white/20 hover:bg-white/35"
                  }`} />
              ))}
            </div>
          ) : total > 10 ? (
            <div className="flex items-center justify-between">
              <button
                onClick={e => { e.stopPropagation(); goTo(page - 1, "right"); }}
                disabled={page <= 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-white/70 text-xs font-semibold disabled:opacity-25 active:scale-95 transition-all shadow-sm">
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>

              <div className="flex flex-col items-center">
                <span className="text-white font-bold text-sm">{page}</span>
                <span className="text-white/30 text-[9px]">of {total}</span>
              </div>

              <button
                onClick={e => { e.stopPropagation(); goTo(page + 1, "left"); }}
                disabled={page >= total}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold disabled:opacity-25 active:scale-95 transition-all shadow-md"
                style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}>
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Compact PDF preview thumbnail ────────────────────────────────────────────
function PdfPreview({ signedUrl, canAccess }: { signedUrl: string; canAccess: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc,     setDoc]     = useState<any>(null);
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const maxPage = canAccess ? total : 2;
  const locked  = !canAccess && page >= 2;

  useEffect(() => {
    getDoc(signedUrl)
      .then(d => { setDoc(d); setTotal(d.numPages); })
      .catch(() => { setError(true); setLoading(false); });
  }, [signedUrl]);

  useEffect(() => {
    if (!doc || !canvasRef.current) return;
    setLoading(true);
    renderPage(doc, page, canvasRef.current)
      .then(() => setLoading(false))
      .catch(() => { setError(true); setLoading(false); });
  }, [doc, page]);

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
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
        </div>
      )}
      <canvas ref={canvasRef} className="w-full block" style={{ opacity: loading ? 0 : 1 }} />

      {locked && !loading && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1.5 rounded-xl">
          <Lock className="w-5 h-5 text-white/60" />
          <p className="text-white text-xs font-semibold">Purchase to read more</p>
        </div>
      )}

      {!loading && !error && total > 1 && (
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/55 backdrop-blur-sm rounded-full px-2.5 py-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="text-white disabled:opacity-30"><ChevronLeft className="w-3 h-3" /></button>
          <span className="text-white text-[10px] font-medium">{page}</span>
          <button onClick={() => setPage(p => Math.min(maxPage, p + 1))} disabled={page >= maxPage}
            className="text-white disabled:opacity-30"><ChevronRight className="w-3 h-3" /></button>
        </div>
      )}
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────
interface Props {
  resource: any;
  isPurchased: boolean;
  isBookmarked: boolean;
  onClose: () => void;
  onBuy: (r: any) => void;
  onDownload: (r: any) => void;
  onBookmarkToggle: (r: any) => void;
}

export function ResourceDetailModal({
  resource, isPurchased, isBookmarked,
  onClose, onBuy, onDownload, onBookmarkToggle,
}: Props) {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();

  const [ratings,        setRatings]        = useState<any[]>([]);
  const [uploader,       setUploader]       = useState<any>(null);
  const [myRating,       setMyRating]       = useState(0);
  const [myReview,       setMyReview]       = useState("");
  const [submitting,     setSubmitting]     = useState(false);
  const [submitted,      setSubmitted]      = useState(false);
  const [previewUrl,     setPreviewUrl]     = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showReader,     setShowReader]     = useState(false);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const reviewsRef  = useRef<HTMLDivElement>(null);

  const isFree    = !resource.price || Number(resource.price) === 0;
  const canAccess = isFree || isPurchased;
  const size      = formatSize(resource.file_size);
  const isPDF     = resource.file_name?.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    const load = async () => {
      const [rRes, uRes] = await Promise.all([
        supabase.from("otechy_ratings")
          .select("*, profiles(name, is_verified)")
          .eq("resource_id", resource.id)
          .order("created_at", { ascending: false }),
        supabase.from("profiles")
          .select("name, is_verified, bio, avatar_url")
          .eq("id", resource.uploader_id)
          .single(),
      ]);
      if (rRes.data) {
        setRatings(rRes.data);
        if (user) {
          const mine = rRes.data.find((r: any) => r.user_id === user.id);
          if (mine) { setMyRating(mine.rating); setMyReview(mine.review ?? ""); setSubmitted(true); }
        }
      }
      if (uRes.data) setUploader(uRes.data);
    };
    load();
  }, [resource.id, user]);

  useEffect(() => {
    if (!isPDF) return;
    setPreviewLoading(true);
    supabase.storage.from("otechy-docs")
      .createSignedUrl(resource.file_url, 3600)
      .then(({ data, error }) => { if (!error && data) setPreviewUrl(data.signedUrl); })
      .finally(() => setPreviewLoading(false));
  }, [resource.file_url, isPDF]);

  const submitRating = async () => {
    if (!myRating) { toast({ title: "Pick a star rating first", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const { data: upserted, error } = await supabase.from("otechy_ratings").upsert({
        resource_id: resource.id, user_id: user.id,
        rating: myRating, review: myReview.trim() || null,
      }, { onConflict: "resource_id,user_id" }).select().single();
      if (error) throw error;

      // Optimistic update — show immediately without waiting for re-fetch
      const optimistic = {
        id: upserted?.id ?? `temp-${Date.now()}`,
        user_id: user.id,
        resource_id: resource.id,
        rating: myRating,
        review: myReview.trim() || null,
        created_at: new Date().toISOString(),
        profiles: { name: uploader?.name ?? "You", is_verified: false },
      };
      setRatings(prev => {
        const without = prev.filter(r => r.user_id !== user.id);
        return [optimistic, ...without];
      });
      setSubmitted(true);
      toast({ title: "⭐ Review submitted!" });
      // Scroll to reviews section so user sees their review
      setTimeout(() => reviewsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

      // Then re-fetch in background to get accurate data
      supabase.from("otechy_ratings")
        .select("*, profiles(name, is_verified)")
        .eq("resource_id", resource.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => { if (data) setRatings(data); });

    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
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
          {/* ── Header ── */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${CAT_COLORS[resource.category] ?? CAT_COLORS["Other"]}`}>
                  {resource.category}
                </span>
                {isFree
                  ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">FREE</span>
                  : isPurchased
                  ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400">OWNED</span>
                  : null}
              </div>
              <h2 className="font-bold text-sm text-foreground leading-snug line-clamp-2">{resource.title}</h2>
              {resource.review_count > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <StarRating value={Math.round(resource.avg_rating ?? 0)} readonly />
                  <span className="text-[10px] text-muted-foreground">
                    {Number(resource.avg_rating ?? 0).toFixed(1)} · {resource.review_count} review{resource.review_count !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => onBookmarkToggle(resource)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                {isBookmarked ? <BookmarkCheck className="w-3.5 h-3.5 text-purple-400" /> : <Bookmark className="w-3.5 h-3.5" />}
              </button>
              <button onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto overscroll-contain" ref={scrollRef}>
            <div className="px-4 py-3 flex flex-col gap-4">

              {uploader && (
                <div className="flex items-center gap-2.5 bg-muted/30 rounded-xl p-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-black text-xs shrink-0">
                    {uploader.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-foreground">{uploader.name}</span>
                      {uploader.is_verified && <BadgeCheck className="w-3 h-3 text-blue-400 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{uploader.bio || "SchoraHub contributor"}</p>
                  </div>
                </div>
              )}

              {resource.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{resource.description}</p>
              )}

              <div className="flex flex-wrap gap-1.5">
                {[
                  { icon: BookOpen,  label: `${resource.download_count ?? 0} downloads` },
                  size ? { icon: FileText, label: size } : null,
                  { icon: Calendar, label: new Date(resource.created_at).toLocaleDateString("en-MW", { day: "numeric", month: "short", year: "numeric" }) },
                ].filter(Boolean).map((m: any) => (
                  <div key={m.label} className="flex items-center gap-1 bg-muted/40 rounded-lg px-2 py-1">
                    <m.icon className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  </div>
                ))}
              </div>

              {/* PDF Preview */}
              {isPDF && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-bold text-foreground uppercase tracking-wide">Preview</p>
                    {!canAccess && <span className="text-[9px] text-muted-foreground">First 2 pages only</span>}
                  </div>
                  {previewLoading ? (
                    <div className="h-40 bg-muted/20 rounded-xl flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : previewUrl ? (
                    <PdfPreview signedUrl={previewUrl} canAccess={canAccess} />
                  ) : (
                    <div className="h-16 bg-muted/20 rounded-xl flex items-center justify-center">
                      <p className="text-[10px] text-muted-foreground">Preview unavailable</p>
                    </div>
                  )}
                </div>
              )}

              {/* Reviews */}
              <div ref={reviewsRef}>
                <p className="text-[10px] font-bold text-foreground uppercase tracking-wide mb-2">Reviews</p>
                <div className="bg-muted/20 rounded-xl p-3 mb-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-foreground">
                      {submitted ? "Your review" : "Rate this resource"}
                    </p>
                    {submitted && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                  </div>
                  <StarRating value={myRating} onChange={v => { setMyRating(v); setSubmitted(false); }} />
                  <textarea value={myReview} onChange={e => { setMyReview(e.target.value); setSubmitted(false); }}
                    rows={2} placeholder="Write a short review… (optional)"
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none" />
                  {!submitted && (
                    <button onClick={submitRating} disabled={submitting || !myRating}
                      className="self-end flex items-center gap-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">
                      {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
                      {submitting ? "Saving…" : "Submit"}
                    </button>
                  )}
                </div>

                {ratings.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-3">No reviews yet — be the first!</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {ratings.map((r: any) => (
                      <div key={r.id} className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/40 to-blue-500/40 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                          {r.profiles?.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-[11px] font-semibold text-foreground">{r.profiles?.name ?? "User"}</span>
                            {r.profiles?.is_verified && <BadgeCheck className="w-3 h-3 text-blue-400" />}
                          </div>
                          <StarRating value={r.rating} readonly />
                          {r.review && <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{r.review}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-4 py-3 border-t border-border bg-card shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-base font-black text-foreground">
                {isFree ? "Free" : `MK ${Number(resource.price).toLocaleString()}`}
              </span>
              {!isFree && !canAccess && size && (
                <span className="text-[10px] text-muted-foreground">{resource.file_name?.split(".").pop()?.toUpperCase()} · {size}</span>
              )}
            </div>

            {canAccess ? (
              <div className="flex gap-2">
                {isPDF && (
                  <button onClick={() => setShowReader(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-muted border border-border text-foreground text-xs font-semibold py-2.5 rounded-xl active:scale-[0.97] transition-all">
                    <Eye className="w-3.5 h-3.5" /> Read
                  </button>
                )}
                <button onClick={() => { onDownload(resource); onClose(); }}
                  className={`flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-semibold py-2.5 rounded-xl active:scale-[0.97] transition-all shadow-md shadow-purple-500/20 ${isPDF ? "flex-1" : "w-full"}`}>
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>
            ) : (
              <button onClick={() => { onBuy(resource); onClose(); }}
                className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-orange-500 to-pink-600 text-white text-xs font-semibold py-2.5 rounded-xl active:scale-[0.97] transition-all shadow-md shadow-orange-500/20">
                <Lock className="w-3.5 h-3.5" /> Buy · MK {Number(resource.price).toLocaleString()}
              </button>
            )}
          </div>
        </div>
      </div>

      {showReader && <PdfReaderModal resource={resource} onClose={() => setShowReader(false)} />}
    </>,
    document.body
  );
}
