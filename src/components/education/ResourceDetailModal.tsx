import { useState, useEffect, useRef, useContext } from "react";
import {
  X, Download, Lock, Star, FileText,
  User, Calendar, BookOpen, Bookmark, BookmarkCheck,
  ChevronLeft, ChevronRight, Loader2, CheckCircle2, BadgeCheck, Eye
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthContext } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// ── Worker URL resolved by Vite at build time (correct for pdfjs 4.x) ──────
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const CAT_COLORS: Record<string, string> = {
  "Past Papers": "bg-blue-500/15 text-blue-400",
  "Textbooks":   "bg-purple-500/15 text-purple-400",
  "Notes":       "bg-green-500/15 text-green-400",
  "Research":    "bg-orange-500/15 text-orange-400",
  "Other":       "bg-gray-500/15 text-gray-400",
};

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

function formatSize(bytes?: number) {
  if (!bytes) return null;
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

// ── Shared: load pdfjs with correct worker ───────────────────────────────────
async function getPdfDoc(url: string) {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjsLib.getDocument({ url, withCredentials: false }).promise;
}

// ── Shared: render one page onto a canvas ────────────────────────────────────
async function renderPdfPage(doc: any, pageNum: number, canvas: HTMLCanvasElement) {
  const page = await doc.getPage(pageNum);
  const containerWidth = canvas.parentElement?.clientWidth || 360;
  const viewport = page.getViewport({ scale: 1 });
  const scale = containerWidth / viewport.width;
  const scaled = page.getViewport({ scale });
  canvas.width  = scaled.width;
  canvas.height = scaled.height;
  const task = page.render({ canvasContext: canvas.getContext("2d")!, viewport: scaled });
  await task.promise;
}

// ── PDF Canvas component (preview + reader share this) ───────────────────────
function PdfCanvas({
  signedUrl,
  page,
  onReady,
  onError,
}: {
  signedUrl: string;
  page: number;
  onReady?: (totalPages: number) => void;
  onError?: () => void;
}) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const docRef     = useRef<any>(null);
  const renderRef  = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPdfDoc(signedUrl)
      .then(doc => {
        if (cancelled) return;
        docRef.current = doc;
        onReady?.(doc.numPages);
        setReady(true);
      })
      .catch(() => { if (!cancelled) onError?.(); });
    return () => { cancelled = true; };
  }, [signedUrl]);

  useEffect(() => {
    if (!ready || !canvasRef.current || !docRef.current) return;
    let cancelled = false;
    const go = async () => {
      if (renderRef.current) {
        try { await renderRef.current.cancel?.(); } catch {}
        renderRef.current = null;
      }
      if (!cancelled && canvasRef.current) {
        try {
          await renderPdfPage(docRef.current, page, canvasRef.current);
        } catch (e: any) {
          if (e?.name !== "RenderingCancelledException" && !cancelled) onError?.();
        }
      }
    };
    go();
    return () => { cancelled = true; };
  }, [ready, page]);

  return <canvas ref={canvasRef} className="w-full block" />;
}

// ── Full-screen PDF reader ───────────────────────────────────────────────────
function PdfReaderModal({ resource, onClose }: { resource: any; onClose: () => void }) {
  const [signedUrl,   setSignedUrl]   = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(false);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState<number | null>(null);
  const [rendering,   setRendering]   = useState(true);

  useEffect(() => {
    supabase.storage.from("otechy-docs")
      .createSignedUrl(resource.file_url, 600)
      .then(({ data, error: e }) => {
        if (e || !data) { setError(true); setLoading(false); return; }
        setSignedUrl(data.signedUrl);
        setLoading(false);
      });
  }, [resource.file_url]);

  const goTo = (p: number) => {
    if (!totalPages) return;
    const clamped = Math.max(1, Math.min(totalPages, p));
    if (clamped !== page) { setRendering(true); setPage(clamped); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#1a1a2e]">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-[#16213e] border-b border-white/10">
        <button onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform shrink-0">
          <X className="w-4 h-4 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white truncate">{resource.title}</p>
          <p className="text-[10px] text-white/50">
            {totalPages ? `Page ${page} of ${totalPages}` : "Loading…"}
          </p>
        </div>
      </div>

      {/* Page area */}
      <div className="flex-1 overflow-y-auto bg-[#0f0f1e] relative">
        {(loading || rendering) && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-black/60 rounded-2xl px-6 py-4 flex flex-col items-center gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-purple-400" />
              <p className="text-xs text-white/60">{loading ? "Loading…" : "Rendering page…"}</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <FileText className="w-12 h-12 text-white/20" />
            <p className="text-sm text-white/50">Could not load document</p>
            <button onClick={onClose}
              className="text-xs text-purple-400 underline">Go back</button>
          </div>
        )}
        {signedUrl && !error && (
          <div className="px-2 py-3">
            <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/50 bg-white">
              <PdfCanvas
                signedUrl={signedUrl}
                page={page}
                onReady={n => { setTotalPages(n); setRendering(false); }}
                onError={() => { setError(true); setRendering(false); }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="shrink-0 bg-[#16213e] border-t border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => goTo(page - 1)} disabled={page <= 1}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold disabled:opacity-30 active:scale-95 transition-all">
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>

          <div className="flex flex-col items-center">
            <span className="text-white font-black text-base">{page}</span>
            {totalPages && <span className="text-white/40 text-[10px]">of {totalPages}</span>}
          </div>

          <button onClick={() => goTo(page + 1)} disabled={!totalPages || page >= totalPages}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold disabled:opacity-30 active:scale-95 transition-all">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Page jump dots for short docs */}
        {totalPages && totalPages <= 10 && (
          <div className="flex items-center justify-center gap-1.5 mt-2.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => goTo(p)}
                className={`rounded-full transition-all ${p === page ? "w-5 h-2 bg-purple-400" : "w-2 h-2 bg-white/20"}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Preview thumbnail (page 1 canvas, locked for unpurchased) ────────────────
function PdfPreview({
  signedUrl,
  canAccess,
}: {
  signedUrl: string;
  canAccess: boolean;
}) {
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState<number | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const [rendering,  setRendering]  = useState(false);

  const maxPage = canAccess ? (total ?? 999) : 2;
  const locked  = !canAccess && page >= 2;

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-white dark:bg-gray-900 relative">
      {loading && (
        <div className="h-52 flex items-center justify-center bg-muted/30">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            <p className="text-[10px] text-muted-foreground">Loading preview…</p>
          </div>
        </div>
      )}
      {error && !loading && (
        <div className="h-32 flex flex-col items-center justify-center gap-1.5">
          <FileText className="w-7 h-7 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Preview unavailable</p>
        </div>
      )}

      {!error && (
        <div className={loading ? "hidden" : ""}>
          <PdfCanvas
            signedUrl={signedUrl}
            page={page}
            onReady={n => { setTotal(n); setLoading(false); }}
            onError={() => { setError(true); setLoading(false); }}
          />
        </div>
      )}

      {/* Lock overlay */}
      {locked && !loading && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-1">
            <Lock className="w-6 h-6 text-white/70" />
          </div>
          <p className="text-white text-sm font-bold">Preview ends here</p>
          <p className="text-white/50 text-xs text-center px-6">Purchase to read the full document</p>
        </div>
      )}

      {/* Page nav pill */}
      {!loading && !error && total && total > 1 && !locked && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2.5 bg-black/65 backdrop-blur-sm rounded-full px-3.5 py-1.5">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="text-white disabled:opacity-30 active:scale-90 transition-transform">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-white text-[11px] font-semibold min-w-[50px] text-center">
            {page} / {Math.min(total, maxPage)}
          </span>
          <button onClick={() => setPage(p => Math.min(maxPage, p + 1))} disabled={page >= maxPage}
            className="text-white disabled:opacity-30 active:scale-90 transition-transform">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main detail modal ────────────────────────────────────────────────────────
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
      .createSignedUrl(resource.file_url, 300)
      .then(({ data, error }) => {
        if (!error && data) setPreviewUrl(data.signedUrl);
      })
      .finally(() => setPreviewLoading(false));
  }, [resource.file_url, isPDF]);

  const submitRating = async () => {
    if (!myRating) { toast({ title: "Pick a star rating first", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("otechy_ratings").upsert({
        resource_id: resource.id, user_id: user.id,
        rating: myRating, review: myReview.trim() || null,
      }, { onConflict: "resource_id,user_id" });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: "⭐ Review submitted!" });
      const { data } = await supabase.from("otechy_ratings")
        .select("*, profiles(name, is_verified)")
        .eq("resource_id", resource.id)
        .order("created_at", { ascending: false });
      if (data) setRatings(data);
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="w-full max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
          style={{ height: "92dvh", maxHeight: "92dvh" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-border shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CAT_COLORS[resource.category] ?? CAT_COLORS["Other"]}`}>
                  {resource.category}
                </span>
                {isFree
                  ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">FREE</span>
                  : isPurchased
                  ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">OWNED</span>
                  : null}
              </div>
              <h2 className="font-black text-base text-foreground leading-snug line-clamp-2">{resource.title}</h2>
              {resource.review_count > 0 && (
                <div className="flex items-center gap-1.5 mt-1">
                  <StarRating value={Math.round(resource.avg_rating ?? 0)} readonly />
                  <span className="text-xs text-muted-foreground">
                    {Number(resource.avg_rating ?? 0).toFixed(1)} · {resource.review_count} review{resource.review_count !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => onBookmarkToggle(resource)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                {isBookmarked ? <BookmarkCheck className="w-4 h-4 text-purple-400" /> : <Bookmark className="w-4 h-4" />}
              </button>
              <button onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="px-5 py-4 flex flex-col gap-5">

              {uploader && (
                <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {uploader.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-foreground">{uploader.name}</span>
                      {uploader.is_verified && <BadgeCheck className="w-4 h-4 text-blue-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{uploader.bio || "OtechySchora contributor"}</p>
                  </div>
                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              )}

              {resource.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{resource.description}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {[
                  { icon: BookOpen,  label: `${resource.download_count ?? 0} downloads` },
                  size ? { icon: FileText, label: size } : null,
                  { icon: Calendar, label: new Date(resource.created_at).toLocaleDateString("en-MW", { day: "numeric", month: "short", year: "numeric" }) },
                ].filter(Boolean).map((m: any) => (
                  <div key={m.label} className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5">
                    <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{m.label}</span>
                  </div>
                ))}
              </div>

              {/* PDF Preview */}
              {isPDF && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wide">Preview</p>
                    {!canAccess && <span className="text-[10px] text-muted-foreground">First 2 pages only</span>}
                  </div>
                  {previewLoading ? (
                    <div className="h-48 bg-muted/30 rounded-xl flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : previewUrl ? (
                    <PdfPreview signedUrl={previewUrl} canAccess={canAccess} />
                  ) : (
                    <div className="h-20 bg-muted/30 rounded-xl flex items-center justify-center">
                      <p className="text-xs text-muted-foreground">Preview unavailable</p>
                    </div>
                  )}
                </div>
              )}

              {/* Reviews */}
              <div>
                <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-3">Reviews</p>
                <div className="bg-muted/30 rounded-xl p-3 mb-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">
                      {submitted ? "Your review" : "Rate this resource"}
                    </p>
                    {submitted && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  </div>
                  <StarRating value={myRating} onChange={v => { setMyRating(v); setSubmitted(false); }} />
                  <textarea value={myReview} onChange={e => { setMyReview(e.target.value); setSubmitted(false); }}
                    rows={2} placeholder="Write a short review… (optional)"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none" />
                  {!submitted && (
                    <button onClick={submitRating} disabled={submitting || !myRating}
                      className="self-end flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-all">
                      {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
                      {submitting ? "Saving…" : "Submit Review"}
                    </button>
                  )}
                </div>
                {ratings.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No reviews yet — be the first!</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {ratings.map((r: any) => (
                      <div key={r.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/40 to-blue-500/40 flex items-center justify-center text-white text-xs font-black shrink-0">
                          {r.profiles?.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-semibold text-foreground">{r.profiles?.name ?? "User"}</span>
                            {r.profiles?.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400" />}
                          </div>
                          <StarRating value={r.rating} readonly />
                          {r.review && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.review}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Sticky footer */}
          <div className="px-5 py-4 border-t border-border bg-card shrink-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl font-black text-foreground">
                {isFree ? "Free" : `MK ${Number(resource.price).toLocaleString()}`}
              </span>
              {!isFree && !canAccess && (
                <span className="text-xs text-muted-foreground">
                  {resource.file_name?.split(".").pop()?.toUpperCase()} · {size}
                </span>
              )}
            </div>

            {canAccess ? (
              <div className="flex gap-2">
                {isPDF && (
                  <button onClick={() => setShowReader(true)}
                    className="flex-1 flex items-center justify-center gap-2 bg-muted hover:bg-muted/70 border border-border text-foreground font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98]">
                    <Eye className="w-4 h-4" /> Read
                  </button>
                )}
                <button onClick={() => { onDownload(resource); onClose(); }}
                  className={`flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-purple-500/20 ${isPDF ? "flex-1" : "w-full"}`}>
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            ) : (
              <button onClick={() => { onBuy(resource); onClose(); }}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20">
                <Lock className="w-4 h-4" /> Buy · MK {Number(resource.price).toLocaleString()}
              </button>
            )}
          </div>
        </div>
      </div>

      {showReader && <PdfReaderModal resource={resource} onClose={() => setShowReader(false)} />}
    </>
  );
}
