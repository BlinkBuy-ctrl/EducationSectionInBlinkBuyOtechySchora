import { useState, useEffect, useRef, useContext } from "react";
import {
  X, Download, Lock, Star, BookOpen, FileText,
  User, Calendar, Eye, Bookmark, BookmarkCheck,
  ChevronLeft, ChevronRight, Loader2, CheckCircle2, BadgeCheck
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthContext } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const CAT_COLORS: Record<string, string> = {
  "Past Papers": "bg-blue-500/15 text-blue-400",
  "Textbooks":   "bg-purple-500/15 text-purple-400",
  "Notes":       "bg-green-500/15 text-green-400",
  "Research":    "bg-orange-500/15 text-orange-400",
  "Other":       "bg-gray-500/15 text-gray-400",
};

function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <button
          key={s}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`transition-colors ${readonly ? "cursor-default" : "cursor-pointer"}`}
        >
          <Star className={`w-4 h-4 ${(hover || value) >= s ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}

function formatSize(bytes?: number) {
  if (!bytes) return null;
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb/1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

// ─── Full-screen PDF reader modal ───────────────────────────────────────────
function PdfReaderModal({ resource, onClose }: { resource: any; onClose: () => void }) {
  const [url, setUrl]      = useState<string | null>(null);
  const [loading, setLoad] = useState(true);
  const [error, setError]  = useState("");
  const [page, setPage]    = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const pdfDocRef = useRef<any>(null);

  useEffect(() => {
    supabase.storage.from("otechy-docs").createSignedUrl(resource.file_url, 600)
      .then(({ data, error: e }) => {
        if (e || !data) { setError("Could not load file."); setLoad(false); return; }
        setUrl(data.signedUrl);
      });
  }, [resource.file_url]);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    const loadPdf = async () => {
      setLoad(true);
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const doc = await pdfjsLib.getDocument({ url, withCredentials: false }).promise;
        if (cancelled) return;
        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        await renderPage(doc, page);
      } catch (e: any) {
        if (!cancelled) setError("Failed to render PDF.");
      } finally {
        if (!cancelled) setLoad(false);
      }
    };

    loadPdf();
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    if (pdfDocRef.current) renderPage(pdfDocRef.current, page);
  }, [page]);

  const renderPage = async (doc: any, pageNum: number) => {
    if (!canvasRef.current) return;

    // Cancel any in-progress render
    if (renderTaskRef.current) {
      try { await renderTaskRef.current.cancel(); } catch {}
      renderTaskRef.current = null;
    }

    try {
      const pdfPage = await doc.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const container = canvas.parentElement!;
      const containerWidth = container.clientWidth || 360;
      const viewport = pdfPage.getViewport({ scale: 1 });
      const scale = containerWidth / viewport.width;
      const scaledViewport = pdfPage.getViewport({ scale });

      canvas.width  = scaledViewport.width;
      canvas.height = scaledViewport.height;

      const ctx = canvas.getContext("2d")!;
      const renderTask = pdfPage.render({ canvasContext: ctx, viewport: scaledViewport });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      renderTaskRef.current = null;
    } catch (e: any) {
      if (e?.name !== "RenderingCancelledException") {
        console.error("Page render error:", e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex-1 min-w-0 mr-3">
          <p className="font-bold text-sm truncate">{resource.title}</p>
          <p className="text-[10px] text-muted-foreground">
            {totalPages ? `Page ${page} of ${totalPages}` : "Loading…"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full block"
          style={{ display: loading || error ? "none" : "block" }}
        />
      </div>

      {/* Page navigation */}
      {totalPages && totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-center gap-4 px-4 py-3 bg-card border-t border-border">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[80px] text-center">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── PDF canvas thumbnail (page 1 only) ────────────────────────────────────
function PdfCanvasPreview({ signedUrl, locked, page, onPageChange, maxPreviewPage }:
  { signedUrl: string; locked: boolean; page: number; onPageChange: (p: number) => void; maxPreviewPage: number }
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [totalPages, setTotal]    = useState<number | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const doc = await pdfjsLib.getDocument({ url: signedUrl, withCredentials: false }).promise;
        if (cancelled) return;
        pdfDocRef.current = doc;
        setTotal(doc.numPages);
        await renderPage(doc, 1);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [signedUrl]);

  useEffect(() => {
    if (pdfDocRef.current) renderPage(pdfDocRef.current, page);
  }, [page]);

  const renderPage = async (doc: any, pageNum: number) => {
    if (!canvasRef.current) return;

    if (renderTaskRef.current) {
      try { await renderTaskRef.current.cancel(); } catch {}
      renderTaskRef.current = null;
    }

    try {
      const pdfPage = await doc.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const container = canvas.parentElement!;
      const containerWidth = container.clientWidth || 320;
      const viewport = pdfPage.getViewport({ scale: 1 });
      const scale = containerWidth / viewport.width;
      const scaledViewport = pdfPage.getViewport({ scale });

      canvas.width  = scaledViewport.width;
      canvas.height = scaledViewport.height;

      const ctx = canvas.getContext("2d")!;
      const renderTask = pdfPage.render({ canvasContext: ctx, viewport: scaledViewport });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      renderTaskRef.current = null;
    } catch (e: any) {
      if (e?.name !== "RenderingCancelledException") setError(true);
    }
  };

  const showLockOverlay = locked && page >= maxPreviewPage;

  return (
    <div className="relative rounded-xl overflow-hidden border border-border bg-white dark:bg-gray-900">
      {loading && (
        <div className="h-56 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      )}
      {error && !loading && (
        <div className="h-32 flex flex-col items-center justify-center gap-2">
          <FileText className="w-8 h-8 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Preview unavailable</p>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full block"
        style={{ display: loading || error ? "none" : "block" }}
      />

      {/* Lock overlay */}
      {showLockOverlay && (
        <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-2 rounded-xl">
          <Lock className="w-7 h-7 text-white/70" />
          <p className="text-white text-sm font-semibold">Preview ends here</p>
          <p className="text-white/60 text-xs">Purchase to read the full document</p>
        </div>
      )}

      {/* Page nav pill */}
      {!loading && !error && totalPages && totalPages > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="text-white disabled:opacity-30"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-white text-[11px] font-medium">Page {page}</span>
          <button
            onClick={() => onPageChange(locked ? Math.min(maxPreviewPage, page + 1) : Math.min(totalPages, page + 1))}
            disabled={locked ? page >= maxPreviewPage : page >= totalPages}
            className="text-white disabled:opacity-30"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main modal ─────────────────────────────────────────────────────────────
interface Props {
  resource: any;
  isPurchased: boolean;
  isBookmarked: boolean;
  onClose: () => void;
  onBuy: (r: any) => void;
  onDownload: (r: any) => void;
  onBookmarkToggle: (r: any) => void;
}

export function ResourceDetailModal({ resource, isPurchased, isBookmarked, onClose, onBuy, onDownload, onBookmarkToggle }: Props) {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();

  const [ratings,       setRatings]       = useState<any[]>([]);
  const [uploader,      setUploader]      = useState<any>(null);
  const [myRating,      setMyRating]      = useState(0);
  const [myReview,      setMyReview]      = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const [submitted,     setSubmitted]     = useState(false);
  const [previewUrl,    setPreviewUrl]    = useState<string | null>(null);
  const [previewPage,   setPreviewPage]   = useState(1);
  const [previewLoading,setPreviewLoading]= useState(false);
  const [showReader,    setShowReader]    = useState(false);

  const isFree    = !resource.price || Number(resource.price) === 0;
  const canAccess = isFree || isPurchased;
  const size      = formatSize(resource.file_size);
  const isPDF     = resource.file_name?.toLowerCase().endsWith(".pdf");
  const MAX_PREVIEW_PAGE = canAccess ? 999 : 2;

  // Load ratings + uploader
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
          .single()
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

  // Get signed URL for PDF preview
  useEffect(() => {
    if (!isPDF) return;
    const load = async () => {
      setPreviewLoading(true);
      try {
        const { data, error } = await supabase.storage
          .from("otechy-docs")
          .createSignedUrl(resource.file_url, 300);
        if (!error && data) setPreviewUrl(data.signedUrl);
      } catch {}
      finally { setPreviewLoading(false); }
    };
    load();
  }, [resource.file_url, isPDF]);

  const submitRating = async () => {
    if (!myRating) { toast({ title: "Pick a star rating first", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("otechy_ratings").upsert({
        resource_id: resource.id,
        user_id: user.id,
        rating: myRating,
        review: myReview.trim() || null,
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

  const onBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <>
      {/* ── Backdrop + sheet ── */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onBackdrop}
      >
        {/*
          KEY FIX: explicit height calc so the modal never overflows the
          viewport, and the inner body scrolls independently of the header/footer.
        */}
        <div
          className="w-full max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
          style={{ height: "92dvh", maxHeight: "92dvh" }}
          onClick={e => e.stopPropagation()}
        >

          {/* ── Header (fixed, never scrolls) ── */}
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
                  : null
                }
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
              <button
                onClick={() => onBookmarkToggle(resource)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {isBookmarked
                  ? <BookmarkCheck className="w-4 h-4 text-purple-400" />
                  : <Bookmark className="w-4 h-4" />
                }
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Scrollable body (only this section scrolls) ── */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="px-5 py-4 flex flex-col gap-5">

              {/* Uploader */}
              {uploader && (
                <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {uploader.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-foreground">{uploader.name}</span>
                      {uploader.is_verified && (
                        <BadgeCheck className="w-4 h-4 text-blue-400 shrink-0" title="Verified uploader" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{uploader.bio || "OtechySchora contributor"}</p>
                  </div>
                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              )}

              {/* Description */}
              {resource.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{resource.description}</p>
              )}

              {/* Meta chips */}
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

              {/* ── PDF PREVIEW (canvas-based, no iframe) ── */}
              {isPDF && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wide">Preview</p>
                    {!canAccess && (
                      <span className="text-[10px] text-muted-foreground">First 2 pages only</span>
                    )}
                  </div>

                  {previewLoading ? (
                    <div className="h-48 bg-muted/50 rounded-xl flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : previewUrl ? (
                    <PdfCanvasPreview
                      signedUrl={previewUrl}
                      locked={!canAccess}
                      page={previewPage}
                      onPageChange={setPreviewPage}
                      maxPreviewPage={MAX_PREVIEW_PAGE}
                    />
                  ) : (
                    <div className="h-24 bg-muted/30 rounded-xl flex items-center justify-center">
                      <p className="text-xs text-muted-foreground">Preview unavailable</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── RATINGS ── */}
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
                  <textarea
                    value={myReview}
                    onChange={e => { setMyReview(e.target.value); setSubmitted(false); }}
                    rows={2}
                    placeholder="Write a short review… (optional)"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                  />
                  {!submitted && (
                    <button
                      onClick={submitRating}
                      disabled={submitting || !myRating}
                      className="self-end flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-all"
                    >
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

          {/* ── Sticky CTA footer (fixed, never scrolls) ── */}
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
              /* Read + Download side by side */
              <div className="flex gap-2">
                {isPDF && (
                  <button
                    onClick={() => setShowReader(true)}
                    className="flex-1 flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] border border-border"
                  >
                    <Eye className="w-4 h-4" /> Read
                  </button>
                )}
                <button
                  onClick={() => { onDownload(resource); onClose(); }}
                  className={`flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-purple-500/20 ${isPDF ? "flex-1" : "w-full"}`}
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            ) : (
              <button
                onClick={() => { onBuy(resource); onClose(); }}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20"
              >
                <Lock className="w-4 h-4" /> Buy · MK {Number(resource.price).toLocaleString()}
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Full-screen reader — mounts outside the modal so it covers everything */}
      {showReader && (
        <PdfReaderModal resource={resource} onClose={() => setShowReader(false)} />
      )}
    </>
  );
}
