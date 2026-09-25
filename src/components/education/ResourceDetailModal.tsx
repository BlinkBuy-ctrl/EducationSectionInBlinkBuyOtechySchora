import { useState, useEffect, useRef, useContext, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X, Download, Lock, Star, FileText,
  User, Calendar, BookOpen, Bookmark, BookmarkCheck,
  ChevronLeft, ChevronRight, Loader2, CheckCircle2, Eye, Share2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AuthContext } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getPdfDocument, renderPage } from "@/lib/pdfEngine";
import { ReadSession } from "./read/ReadSession";

const CAT_COLORS: Record<string, string> = {
  "Past Papers": "bg-blue-500/15 text-blue-400",
  "Textbooks":   "bg-sky-500/15 text-sky-400",
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
    getPdfDocument(signedUrl)
      .then(d => { setDoc(d); setTotal(d.numPages); })
      .catch(() => { setError(true); setLoading(false); });
  }, [signedUrl]);

  useEffect(() => {
    if (!doc || !canvasRef.current) return;
    setLoading(true);
    renderPage(doc, page, canvasRef.current, { docUrl: signedUrl })
      .then(() => setLoading(false))
      .catch(() => { setError(true); setLoading(false); });
  }, [doc, page, signedUrl]);

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
  onRatingSubmit?: (resourceId: string) => void;
  allResources?: any[];
  onOpenSimilar?: (r: any) => void;
  client: SupabaseClient; // which level's backend this resource lives in
  level: string;          // "MSCE" | "JCE" | "Primary" — for reading-progress tracking
  autoOpenReader?: boolean; // jump straight into the reader — used by the "Continue Reading" strip
}

export function ResourceDetailModal({
  resource, isPurchased, isBookmarked,
  onClose, onBuy, onDownload, onBookmarkToggle, onRatingSubmit,
  allResources, onOpenSimilar, client, level, autoOpenReader,
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

  // "Continue Reading" hands us a resource and asks to skip straight past
  // the detail page into the reader itself — one tap, not two.
  useEffect(() => {
    if (autoOpenReader) setShowReader(true);
  }, [autoOpenReader, resource.id]);

  const isFree    = !resource.price || Number(resource.price) === 0;
  const canAccess = isFree || isPurchased;
  const size      = formatSize(resource.file_size);
  const isPDF     = resource.file_name?.toLowerCase().endsWith(".pdf");

  // "Similar to this book" — same subject first (strongest signal, now that
  // every resource actually has a subject), then same category as a
  // secondary match. Replaces the old fuzzy title-keyword heuristic, which
  // was only ever a workaround for not having subject data.
  const similar = useMemo(() => {
    if (!allResources?.length) return [];
    return allResources
      .filter(r => r.id !== resource.id)
      .map(r => {
        const sameSubject  = r.subject  && r.subject === resource.subject;
        const sameCategory = r.category === resource.category;
        const score = (sameSubject ? 2 : 0) + (sameCategory ? 1 : 0);
        return { r, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score || new Date(b.r.created_at).getTime() - new Date(a.r.created_at).getTime())
      .slice(0, 10)
      .map(x => x.r);
  }, [allResources, resource.id, resource.subject, resource.category]);

  useEffect(() => {
    const load = async () => {
      const [rRes, uRes] = await Promise.all([
        client.from("otechy_ratings")
          .select("id,user_id,resource_id,rating,review,created_at")
          .eq("resource_id", resource.id)
          .order("created_at", { ascending: false }),
        supabase.from("profiles")
          .select("name, is_verified, bio, avatar_url")
          .eq("id", resource.uploader_id)
          .maybeSingle(),
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
    client.storage.from("otechy-docs")
      .createSignedUrl(resource.file_url, 3600)
      .then(({ data, error }) => { if (!error && data) setPreviewUrl(data.signedUrl); })
      .finally(() => setPreviewLoading(false));
  }, [resource.file_url, isPDF]);

  const submitRating = async () => {
    if (!myRating) { toast({ title: "Pick a star rating first", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const { data: upserted, error } = await client.from("otechy_ratings").upsert({
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
      };
      setRatings(prev => {
        const without = prev.filter(r => r.user_id !== user.id);
        return [optimistic, ...without];
      });
      setSubmitted(true);
      toast({ title: "⭐ Review submitted!" });
      setTimeout(() => reviewsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      // Tell parent to refresh counts for this resource's card
      onRatingSubmit?.(resource.id);

      // Re-fetch in background to get accurate data
      client.from("otechy_ratings")
        .select("id,user_id,resource_id,rating,review,created_at")
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
              <h2 className="font-bold text-base text-foreground leading-snug line-clamp-2">{resource.title}</h2>
              {resource.review_count > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <StarRating value={Math.round(resource.avg_rating ?? 0)} readonly />
                  <span className="text-xs text-foreground/70">
                    {Number(resource.avg_rating ?? 0).toFixed(1)} · {resource.review_count} review{resource.review_count !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={async () => {
                  const shareData = {
                    title: resource.title,
                    text: `Hey, I found this interesting resource on SchoraHub! 📚 "${resource.title}" — you won't find this anywhere else. Check it out at SchoraHub by Otechy 👇\nhttps://schorahub.vercel.app`,
                  };
                  try {
                    if (navigator.share) {
                      await navigator.share(shareData);
                    } else {
                      await navigator.clipboard.writeText(shareData.text);
                      toast({ title: "Link copied!", description: "Share it anywhere you like." });
                    }
                  } catch { /* user cancelled share sheet */ }
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onBookmarkToggle(resource)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                {isBookmarked ? <BookmarkCheck className="w-3.5 h-3.5 text-sky-400" /> : <Bookmark className="w-3.5 h-3.5" />}
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-black text-xs shrink-0">
                    {uploader.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-foreground">{uploader.name}</span>
                      {uploader.is_verified && <BadgeCheck className="w-3 h-3 text-blue-400 shrink-0" />}
                    </div>
                    <p className="text-[13px] text-foreground/70 truncate">{uploader.bio || "SchoraHub contributor"}</p>
                  </div>
                </div>
              )}

              {resource.description && (
                <p className="text-sm text-foreground/80 leading-relaxed">{resource.description}</p>
              )}

              <div className="flex flex-wrap gap-1.5">
                {[
                  { icon: BookOpen,  label: `${resource.download_count ?? 0} downloads` },
                  size ? { icon: FileText, label: size } : null,
                  { icon: Calendar, label: new Date(resource.created_at).toLocaleDateString("en-MW", { day: "numeric", month: "short", year: "numeric" }) },
                ].filter(Boolean).map((m: any) => (
                  <div key={m.label} className="flex items-center gap-1 bg-muted/40 rounded-lg px-2 py-1">
                    <m.icon className="w-3 h-3 text-foreground/60" />
                    <span className="text-xs text-foreground/70">{m.label}</span>
                  </div>
                ))}
              </div>

              {/* PDF Preview */}
              {isPDF && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wide">Preview</p>
                    {!canAccess && <span className="text-xs text-foreground/60">First 2 pages only</span>}
                  </div>
                  {previewLoading ? (
                    <div className="h-40 bg-muted/20 rounded-xl flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : previewUrl ? (
                    <PdfPreview signedUrl={previewUrl} canAccess={canAccess} />
                  ) : (
                    <div className="h-16 bg-muted/20 rounded-xl flex items-center justify-center">
                      <p className="text-xs text-foreground/60">Preview unavailable</p>
                    </div>
                  )}
                </div>
              )}

              {/* Reviews */}
              <div ref={reviewsRef}>
                <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-2">Reviews</p>
                <div className="bg-muted/20 rounded-xl p-3 mb-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-foreground">
                      {submitted ? "Your review" : "Rate this resource"}
                    </p>
                    {submitted && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                  </div>
                  <StarRating value={myRating} onChange={v => { setMyRating(v); setSubmitted(false); }} />
                  <textarea value={myReview} onChange={e => { setMyReview(e.target.value); setSubmitted(false); }}
                    rows={2} placeholder="Write a short review… (optional)"
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-sky-500/50 resize-none" />
                  {!submitted && (
                    <button onClick={submitRating} disabled={submitting || !myRating}
                      className="self-end flex items-center gap-1 bg-gradient-to-r from-sky-600 to-blue-600 text-white text-[13px] font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">
                      {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
                      {submitting ? "Saving…" : "Submit"}
                    </button>
                  )}
                </div>

                {ratings.length === 0 ? (
                  <p className="text-xs text-foreground/60 text-center py-3">No reviews yet — be the first!</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {ratings.map((r: any) => (
                      <div key={r.id} className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500/40 to-blue-500/40 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                          {(r.user_id ?? "??").slice(-2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-[13px] font-semibold text-foreground">
                              {r.user_id === user?.id ? "You" : `User ${(r.user_id ?? "0000").slice(-4).toUpperCase()}`}
                            </span>
                          </div>
                          <StarRating value={r.rating} readonly />
                          {r.review && <p className="text-[13px] text-foreground/80 mt-0.5 leading-relaxed">{r.review}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {similar.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-foreground mb-2">📚 Similar to this book</p>
                  <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1">
                    {similar.map(r => (
                      <div
                        key={r.id}
                        onClick={() => onOpenSimilar?.(r)}
                        className="snap-start shrink-0 w-[42%] max-w-[150px] bg-muted/30 border border-border rounded-xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform"
                      >
                        <div className="relative w-full bg-muted/50 flex items-center justify-center" style={{ height: 72 }}>
                          {r.thumbnail_url ? (
                            <img src={r.thumbnail_url} alt={r.title} className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="p-2">
                          <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-1 ${CAT_COLORS[r.category] ?? CAT_COLORS["Other"]}`}>
                            {r.category}
                          </span>
                          <p className="text-[12.5px] font-semibold text-foreground leading-snug line-clamp-2">{r.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  className={`flex items-center justify-center gap-1.5 bg-gradient-to-r from-sky-600 to-blue-600 text-white text-xs font-semibold py-2.5 rounded-xl active:scale-[0.97] transition-all shadow-md shadow-sky-500/20 ${isPDF ? "flex-1" : "w-full"}`}>
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

      {showReader && <ReadSession resource={resource} onClose={() => setShowReader(false)} client={client} level={level} />}
    </>,
    document.body
  );
}
