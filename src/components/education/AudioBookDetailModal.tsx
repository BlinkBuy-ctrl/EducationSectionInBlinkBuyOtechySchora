import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X, Play, Pause, RotateCcw, RotateCw, Download, Lock, Star,
  Bookmark, Share2, Loader2, Music, Mic2, Gauge,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { AudioBook, TABLE_AUDIOBOOK_REVIEWS, getSignedAudioUrl, formatDuration, shareAudioBook } from "@/lib/audiobooks";

const SPEEDS = [1, 1.25, 1.5, 1.75, 2, 0.75];

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
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
  const [ratingBusy,  setRatingBusy]  = useState(false);
  const [seeking,     setSeeking]     = useState(false);
  const [scrubPct,    setScrubPct]    = useState(0);
  const [coverFailed, setCoverFailed] = useState(false);

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

  const submitRating = useCallback(async (rating: number) => {
    setRatingBusy(true);
    try {
      const { error } = await supabase.from(TABLE_AUDIOBOOK_REVIEWS)
        .upsert({ audiobook_id: audiobook.id, user_id: userId, rating }, { onConflict: "audiobook_id,user_id" });
      if (error) throw error;
      setMyRating(rating);
      onRatingSubmit(audiobook.id);
      toast({ title: "⭐ Thanks for rating!" });
    } catch (e: any) {
      toast({ title: "Rating failed", description: e.message, variant: "destructive" });
    } finally { setRatingBusy(false); }
  }, [audiobook.id, userId, onRatingSubmit, toast]);

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
      <div className="relative w-full shrink-0" style={{ aspectRatio: "4/3", maxHeight: 340 }}>
        {showCover ? (
          <img src={audiobook.cover_url!} alt={audiobook.title} className="w-full h-full object-cover"
            onError={() => setCoverFailed(true)} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-pink-600 via-purple-700 to-indigo-800 flex items-center justify-center">
            <div className="w-24 h-28 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-xl">
              <Music className="w-12 h-12 text-white" />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-black/30" />

        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 0px) + 8px)" }}>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-2">
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

        {/* Title block over the hero */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-white mb-2">
            🎧 {audiobook.category}
          </span>
          <h1 className="text-xl font-black text-white leading-tight mb-1">{audiobook.title}</h1>
          {(audiobook.author || audiobook.narrator) && (
            <p className="text-xs text-white/70">
              {audiobook.author && <>By {audiobook.author}</>}
              {audiobook.author && audiobook.narrator && " · "}
              {audiobook.narrator && <span className="inline-flex items-center gap-1"><Mic2 className="w-3 h-3" />Narrated by {audiobook.narrator}</span>}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-5 py-5 flex flex-col gap-5 max-w-lg w-full mx-auto">

        {/* Stats row */}
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
              {/* Seek bar */}
              <div className="flex flex-col gap-1.5">
                <input
                  type="range" min={0} max={100} step={0.1}
                  value={displayPct}
                  disabled={urlLoading}
                  onChange={e => onSeekInput(Number(e.target.value))}
                  onMouseUp={e => onSeekCommit(Number((e.target as HTMLInputElement).value))}
                  onTouchEnd={e => onSeekCommit(Number((e.target as HTMLInputElement).value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-pink-600"
                  style={{ background: `linear-gradient(to right,#db2777 ${displayPct}%,var(--muted) ${displayPct}%)` }}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>{formatClock(seeking ? (scrubPct / 100) * duration : currentTime)}</span>
                  <span>{formatClock(duration)}</span>
                </div>
              </div>

              {/* Transport controls */}
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

              {/* Speed + Download */}
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

        {/* Description */}
        {audiobook.description && (
          <div>
            <h2 className="text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">About</h2>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{audiobook.description}</p>
          </div>
        )}

        {/* Rate this audio book */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-xs font-bold text-muted-foreground mb-2.5 uppercase tracking-wide">Rate this audio book</h2>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} disabled={ratingBusy} onClick={() => submitRating(n)}
                className="active:scale-90 transition-transform disabled:opacity-50">
                <Star className={`w-6 h-6 ${n <= myRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
