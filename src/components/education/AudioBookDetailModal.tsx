import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X, Play, Pause, RotateCcw, RotateCw, Download, Lock, Star,
  Bookmark, Share2, Loader2, Music, Mic2, Gauge, Expand, MessageSquareText,
} from "lucide-react";
import { bookshopSupabase } from "@/lib/bookshopSupabase";
import { useToast } from "@/hooks/use-toast";
import { AudioBook, TABLE_AUDIOBOOK_REVIEWS, getSignedAudioUrl, formatDuration, shareAudioBook } from "@/lib/audiobooks";

const SPEEDS = [1, 1.25, 1.5, 1.75, 2, 0.75];

// Seamlessly-tiling sine-ish wave: starts/ends at the same phase (y=10,
// midline of a 0-20 viewBox) so two copies placed side by side and
// scrolled by exactly one tile-width loop with no visible seam.
const WAVE_PATH =
  "M0,10 Q5,0 10,10 T20,10 T30,10 T40,10 T50,10 T60,10 T70,10 T80,10 T90,10 T100,10";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  reviewer_name?: string | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Animated, colored waveform seek bar ────────────────────────────────────
// Two full-width wave layers (muted behind, colored in front) render the
// SAME scrolling pattern so they always line up pixel-for-pixel. The
// colored layer is masked with clip-path to only show the played fraction —
// that avoids any width-percentage math drifting the wave shape out of
// alignment. The wave only scrolls (looks "alive") while audio is playing;
// it freezes in place the instant playback pauses.
function WaveformSeekBar({
  progressPct,
  isPlaying,
  disabled,
  onSeekInput,
  onSeekCommit,
}: {
  progressPct: number;
  isPlaying: boolean;
  disabled: boolean;
  onSeekInput: (pct: number) => void;
  onSeekCommit: (pct: number) => void;
}) {
  const clampedPct = Math.min(100, Math.max(0, progressPct));

  return (
    <div className="relative w-full h-9 select-none">
      <style>{`
        @keyframes shWaveScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .sh-wave-scroll { animation: shWaveScroll 2.4s linear infinite; }
        .sh-wave-scroll.sh-wave-paused { animation-play-state: paused; }
      `}</style>

      {/* Shared gradient def — referenced by the colored wave tiles below */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="shWaveGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#db2777" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>

      {/* Muted background wave — always full track, always visible */}
      <div className="absolute inset-0 overflow-hidden rounded-full">
        <div className={`flex h-full w-[200%] sh-wave-scroll ${isPlaying ? "" : "sh-wave-paused"}`}>
          {[0, 1].map(i => (
            <svg key={i} viewBox="0 0 100 20" preserveAspectRatio="none" className="w-1/2 h-full shrink-0">
              <path d={WAVE_PATH} fill="none" stroke="var(--border)" strokeWidth="3.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
          ))}
        </div>
      </div>

      {/* Colored wave — identical pattern, masked to the played fraction */}
      <div
        className="absolute inset-0 overflow-hidden rounded-full pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - clampedPct}% 0 0)` }}
      >
        <div className={`flex h-full w-[200%] sh-wave-scroll ${isPlaying ? "" : "sh-wave-paused"}`}>
          {[0, 1].map(i => (
            <svg key={i} viewBox="0 0 100 20" preserveAspectRatio="none" className="w-1/2 h-full shrink-0">
              <path d={WAVE_PATH} fill="none" stroke="url(#shWaveGradient)" strokeWidth="3.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
          ))}
        </div>
      </div>

      {/* Thumb — sits on top of both wave layers at the current position */}
      <div
        className="absolute top-1/2 w-3.5 h-3.5 rounded-full pointer-events-none shadow-md"
        style={{
          left: `${clampedPct}%`,
          transform: "translate(-50%, -50%)",
          background: "linear-gradient(135deg,#db2777,#7c3aed)",
          boxShadow: "0 0 0 3px rgba(219,39,119,0.15)",
        }}
      />

      {/* Invisible range input on top — keeps drag-to-seek working exactly as before */}
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={clampedPct}
        disabled={disabled}
        onChange={e => onSeekInput(Number(e.target.value))}
        onMouseUp={e => onSeekCommit(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={e => onSeekCommit(Number((e.target as HTMLInputElement).value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
      />
    </div>
  );
}

interface Props {
  audiobook: AudioBook;
  userId: string;
  isPurchased: boolean;
  isBookmarked: boolean;
  onClose: () => void;
  onBuy: (a: AudioBook) => void;
  onDownload: (a: AudioBook) => void;
  onBookmarkToggle: (a: AudioBook) => void;
  onPlayStart: (a: AudioBook) => void;
  onRatingSubmit: (audiobookId: string) => void;
}

export function AudioBookDetailModal({
  audiobook, userId, isPurchased, isBookmarked, onClose,
  onBuy, onDownload, onBookmarkToggle, onPlayStart, onRatingSubmit,
}: Props) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasFiredPlay = useRef(false);

  const [signedUrl,   setSignedUrl]   = useState<string | null>(null);
  const [urlLoading,  setUrlLoading]  = useState(false);
  const [urlError,    setUrlError]    = useState(false);
  const [playing,     setPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(audiobook.duration_seconds ?? 0);
  const [speedIdx,    setSpeedIdx]    = useState(0);
  const [myRating,    setMyRating]    = useState(0);
  const [reviewText,  setReviewText]  = useState("");
  const [ratingBusy,  setRatingBusy]  = useState(false);
  const [ratingSent,  setRatingSent]  = useState(false);
  const [seeking,     setSeeking]     = useState(false);
  const [scrubPct,    setScrubPct]    = useState(0);
  const [coverFailed, setCoverFailed] = useState(false);
  const [reviews,     setReviews]     = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [coverOpen,   setCoverOpen]   = useState(false);

  const isFree    = !audiobook.price || Number(audiobook.price) === 0;
  const canAccess = isFree || isPurchased;
  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  // Fetch a signed playback URL once, only if the user can actually access it
  useEffect(() => {
    if (!canAccess) return;
    setUrlLoading(true);
    getSignedAudioUrl(audiobook.audio_url, 3600)
      .then(url => setSignedUrl(url))
      .catch(() => setUrlError(true))
      .finally(() => setUrlLoading(false));
  }, [audiobook.audio_url, canAccess]);

  // Pause + release audio if the modal closes
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    const { data, error } = await bookshopSupabase
      .from(TABLE_AUDIOBOOK_REVIEWS)
      .select("*")
      .eq("audiobook_id", audiobook.id)
      .order("created_at", { ascending: false });
    if (!error && data) setReviews(data as Review[]);
    setReviewsLoading(false);
  }, [audiobook.id]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const togglePlay = async () => {
    if (!canAccess) { onBuy(audiobook); return; }
    const el = audioRef.current;
    if (!el || !signedUrl) return;
    if (playing) { el.pause(); setPlaying(false); return; }
    try {
      await el.play();
      setPlaying(true);
      if (!hasFiredPlay.current) { hasFiredPlay.current = true; onPlayStart(audiobook); }
    } catch { /* autoplay/user-gesture edge case — ignore */ }
  };

  const skip = (delta: number) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    el.currentTime = Math.min(Math.max(0, el.currentTime + delta), duration);
  };

  const onSeekInput = (pct: number) => { setSeeking(true); setScrubPct(pct); };
  const onSeekCommit = (pct: number) => {
    const el = audioRef.current;
    setSeeking(false);
    if (!el || !duration) return;
    el.currentTime = (pct / 100) * duration;
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  };

  const handleShare = async () => {
    const result = await shareAudioBook(audiobook);
    if (result === "copied") toast({ title: "🔗 Link copied!", description: "Share it anywhere." });
    else if (result === "failed") toast({ title: "Couldn't share", variant: "destructive" });
  };

  const submitRating = useCallback(async () => {
    if (myRating === 0) { toast({ title: "Pick a star rating first", variant: "destructive" }); return; }
    setRatingBusy(true);
    try {
      const { error } = await bookshopSupabase.from(TABLE_AUDIOBOOK_REVIEWS)
        .upsert(
          { audiobook_id: audiobook.id, user_id: userId, rating: myRating, review_text: reviewText.trim() || null },
          { onConflict: "audiobook_id,user_id" }
        );
      if (error) throw error;
      onRatingSubmit(audiobook.id);
      setRatingSent(true);
      await loadReviews();
      toast({ title: "⭐ Thanks for rating!" });
    } catch (e: any) {
      toast({ title: "Rating failed", description: e.message, variant: "destructive" });
    } finally { setRatingBusy(false); }
  }, [audiobook.id, userId, myRating, reviewText, onRatingSubmit, toast]);

  const displayPct = seeking ? scrubPct : progressPct;
  const showCover = !!audiobook.cover_url && !coverFailed;

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-background flex flex-col overflow-y-auto">

      {/* Hidden native audio element — all playback state flows through this */}
      {signedUrl && (
        <audio
          ref={audioRef}
          src={signedUrl}
          onLoadedMetadata={e => setDuration(e.currentTarget.duration || duration)}
          onTimeUpdate={e => { if (!seeking) setCurrentTime(e.currentTarget.currentTime); }}
          onEnded={() => setPlaying(false)}
        />
      )}

      {/* Hero */}
      <div className="relative w-full shrink-0 overflow-hidden" style={{ aspectRatio: "4/3", maxHeight: 340 }}>
        {showCover ? (
          <>
            <img src={audiobook.cover_url!} alt="" aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60" />
            <img src={audiobook.cover_url!} alt={audiobook.title}
              className="relative w-full h-full object-contain"
              onError={() => setCoverFailed(true)} />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-pink-600 via-purple-700 to-indigo-800 flex items-center justify-center">
            <div className="w-24 h-28 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-xl">
              <Music className="w-12 h-12 text-white" />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black to-transparent pointer-events-none" />

        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 0px) + 8px)" }}>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-2">
            {showCover && (
              <button onClick={() => setCoverOpen(true)}
                className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
                <Expand className="w-4 h-4 text-white" />
              </button>
            )}
            <button onClick={handleShare}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
              <Share2 className="w-4 h-4 text-white" />
            </button>
            <button onClick={() => onBookmarkToggle(audiobook)}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
              <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-pink-400 text-pink-400" : "text-white"}`} />
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5">
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-white mb-2 tracking-wide">
            🎧 {audiobook.category}
          </span>
          <h1 className="text-2xl font-black text-white leading-tight mb-1 drop-shadow-sm">{audiobook.title}</h1>
          {(audiobook.author || audiobook.narrator) && (
            <p className="text-xs text-white/80">
              {audiobook.author && <>By {audiobook.author}</>}
              {audiobook.author && audiobook.narrator && " · "}
              {audiobook.narrator && <span className="inline-flex items-center gap-1"><Mic2 className="w-3 h-3" />Narrated by {audiobook.narrator}</span>}
            </p>
          )}
        </div>
      </div>

      {coverOpen && showCover && (
        <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-6"
          onClick={() => setCoverOpen(false)}>
          <button onClick={() => setCoverOpen(false)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center active:scale-90 transition-transform"
            style={{ marginTop: "env(safe-area-inset-top, 0px)" }}>
            <X className="w-4 h-4 text-white" />
          </button>
          <img src={audiobook.cover_url!} alt={audiobook.title}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Body */}
      <div className="flex-1 px-5 py-5 flex flex-col gap-5 max-w-lg w-full mx-auto">

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-bold">{audiobook.review_count > 0 ? Number(audiobook.avg_rating).toFixed(1) : "—"}</span>
            <span className="text-[11px] text-muted-foreground">({audiobook.review_count})</span>
          </div>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-[11px] text-muted-foreground">{formatDuration(duration)}</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-[11px] text-muted-foreground">{audiobook.play_count} plays</span>
          <span className="ml-auto text-sm font-black px-2.5 py-1 rounded-full text-white"
            style={{ background: isFree ? "#10b981" : isPurchased ? "#3b82f6" : "linear-gradient(135deg,#db2777,#7c3aed)" }}>
            {isFree ? "FREE" : isPurchased ? "OWNED" : `MK ${Number(audiobook.price).toLocaleString()}`}
          </span>
        </div>

        {/* Player card */}
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4"
          style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>

          {!canAccess ? (
            <button onClick={() => onBuy(audiobook)}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 text-white text-sm font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all shadow-md">
              <Lock className="w-4 h-4" /> Buy to Listen — MK {Number(audiobook.price).toLocaleString()}
            </button>
          ) : urlError ? (
            <p className="text-center text-xs text-red-500 py-4">Couldn't load audio. Pull down to retry.</p>
          ) : (
            <>
              {/* Waveform seek bar — colored, animated, snake-like motion while playing */}
              <div className="flex flex-col gap-1.5">
                <WaveformSeekBar
                  progressPct={displayPct}
                  isPlaying={playing}
                  disabled={urlLoading}
                  onSeekInput={onSeekInput}
                  onSeekCommit={onSeekCommit}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>{formatClock(seeking ? (scrubPct / 100) * duration : currentTime)}</span>
                  <span>{formatClock(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-6">
                <button onClick={() => skip(-15)} disabled={urlLoading}
                  className="flex flex-col items-center gap-0.5 text-muted-foreground active:scale-90 transition-transform disabled:opacity-40">
                  <RotateCcw className="w-5 h-5" />
                  <span className="text-[8px] font-bold">15</span>
                </button>

                <button onClick={togglePlay} disabled={urlLoading}
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#db2777,#7c3aed)" }}>
                  {urlLoading ? <Loader2 className="w-6 h-6 animate-spin" />
                    : playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>

                <button onClick={() => skip(15)} disabled={urlLoading}
                  className="flex flex-col items-center gap-0.5 text-muted-foreground active:scale-90 transition-transform disabled:opacity-40">
                  <RotateCw className="w-5 h-5" />
                  <span className="text-[8px] font-bold">15</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={cycleSpeed}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl border border-border text-muted-foreground active:scale-[0.98] transition-all">
                  <Gauge className="w-3.5 h-3.5" /> {SPEEDS[speedIdx]}×
                </button>
                <button onClick={() => onDownload(audiobook)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-bold py-2 rounded-xl active:scale-[0.98] transition-all shadow-sm">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>
            </>
          )}
        </div>

        {audiobook.description && (
          <div>
            <h2 className="text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">About</h2>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{audiobook.description}</p>
          </div>
        )}

        {/* Rate this audio book — compact version */}
        <div className="rounded-xl border border-border bg-card p-3">
          <h2 className="text-[11px] font-bold text-muted-foreground mb-2 uppercase tracking-wide">Rate this audio book</h2>
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} disabled={ratingBusy} onClick={() => { setMyRating(n); setRatingSent(false); }}
                className="active:scale-90 transition-transform disabled:opacity-50">
                <Star className={`w-4.5 h-4.5 ${n <= myRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} style={{ width: 18, height: 18 }} />
              </button>
            ))}
          </div>
          <textarea
            value={reviewText}
            onChange={e => { setReviewText(e.target.value); setRatingSent(false); }}
            disabled={ratingBusy}
            placeholder="Write a review (optional)…"
            rows={2}
            maxLength={500}
            className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-pink-500/40 resize-none mb-2"
          />
          <button onClick={submitRating} disabled={ratingBusy || myRating === 0}
            className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-bold py-2 rounded-lg active:scale-[0.98] transition-all shadow-sm disabled:opacity-50">
            {ratingBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : ratingSent ? "✅ Submitted" : "Submit Rating"}
          </button>
        </div>

        {/* Reviews list — compact version */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <MessageSquareText className="w-3.5 h-3.5 text-muted-foreground" />
            <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
              Reviews {reviews.length > 0 && `(${reviews.length})`}
            </h2>
          </div>

          {reviewsLoading ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-xs text-muted-foreground/70 text-center py-3">
              No reviews yet — be the first to share your thoughts.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {reviews.map(r => (
                <div key={r.id} className="rounded-lg border border-border bg-card/60 p-2.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} style={{ width: 10, height: 10 }} className={`${n <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/25"}`} />
                      ))}
                    </div>
                    <span className="text-[9px] text-muted-foreground">{timeAgo(r.created_at)}</span>
                  </div>
                  {r.review_text && (
                    <p className="text-xs text-foreground/85 leading-relaxed">{r.review_text}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}