import { useState, useRef, useEffect } from "react";
import { Music, Download, Lock, Star, BadgeCheck, Play, Pause, Loader2, Mic2 } from "lucide-react";
import { AudioBook, formatDuration, getSignedAudioUrl } from "@/lib/audiobooks";

const CAT_COLORS: Record<string, string> = {
  "Fiction":      "bg-pink-500/15 text-pink-500 dark:text-pink-400",
  "Non-Fiction":  "bg-blue-500/15 text-blue-500 dark:text-blue-400",
  "Educational":  "bg-purple-500/15 text-purple-500 dark:text-purple-400",
  "Religious":    "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "Other":        "bg-gray-500/15 text-gray-500 dark:text-gray-400",
};

const CAT_GRADIENTS: Record<string, string> = {
  "Fiction":      "from-pink-600 to-rose-600",
  "Non-Fiction":  "from-blue-600 to-indigo-600",
  "Educational":  "from-purple-600 to-violet-600",
  "Religious":    "from-amber-500 to-orange-600",
  "Other":        "from-gray-500 to-slate-600",
};

interface Props {
  audiobook: AudioBook;
  isPurchased: boolean;
  onBuy: (a: AudioBook) => void;
  onDownload: (a: AudioBook) => void;
  onOpen: (a: AudioBook) => void;
  onPlayStart?: (a: AudioBook) => void; // let the parent bump play_count once per session
}

export function AudioBookCard({ audiobook, isPurchased, onBuy, onDownload, onOpen, onPlayStart }: Props) {
  const [coverFailed, setCoverFailed] = useState(false);
  const [playing,     setPlaying]     = useState(false);
  const [loadingUrl,  setLoadingUrl]  = useState(false);
  const [progressPct, setProgressPct] = useState(0);

  const audioElRef  = useRef<HTMLAudioElement | null>(null);
  const hasFiredPlay = useRef(false);

  const isFree     = !audiobook.price || Number(audiobook.price) === 0;
  const canAccess  = isFree || isPurchased;
  const hasRating  = audiobook.review_count > 0;
  const showCover  = !!audiobook.cover_url && !coverFailed;
  const grad       = CAT_GRADIENTS[audiobook.category] ?? CAT_GRADIENTS["Other"];

  // Stop playback if the card unmounts (e.g. filters change) so audio doesn't keep running invisibly
  useEffect(() => {
    return () => { audioElRef.current?.pause(); };
  }, []);

  const togglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canAccess) { onBuy(audiobook); return; }

    if (audioElRef.current) {
      if (playing) { audioElRef.current.pause(); setPlaying(false); }
      else {
        await audioElRef.current.play();
        setPlaying(true);
        if (!hasFiredPlay.current) { hasFiredPlay.current = true; onPlayStart?.(audiobook); }
      }
      return;
    }

    setLoadingUrl(true);
    try {
      const url = await getSignedAudioUrl(audiobook.audio_url);
      const el = new Audio(url);
      el.addEventListener("timeupdate", () => {
        if (el.duration) setProgressPct((el.currentTime / el.duration) * 100);
      });
      el.addEventListener("ended", () => setPlaying(false));
      audioElRef.current = el;
      await el.play();
      setPlaying(true);
      hasFiredPlay.current = true;
      onPlayStart?.(audiobook);
    } catch {
      // signed URL failed — silently drop back to idle, user can retry
    } finally {
      setLoadingUrl(false);
    }
  };

  return (
    <div
      onClick={() => onOpen(audiobook)}
      className="group relative flex flex-col bg-card border border-border rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-150 cursor-pointer"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
    >
      {/* ── Cover area ── */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/4", maxHeight: 200 }}>

        {showCover ? (
          <img
            src={audiobook.cover_url!}
            alt={audiobook.title}
            className="w-full h-full object-cover object-top"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${grad} flex flex-col items-center justify-center gap-3 p-4`}>
            <div className="w-14 h-16 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
              <Music className="w-7 h-7 text-white" />
            </div>
            <p className="text-white/80 text-[10px] font-semibold text-center leading-tight line-clamp-3 px-1">
              {audiobook.title}
            </p>
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm bg-white/90 dark:bg-black/60 ${CAT_COLORS[audiobook.category] ?? CAT_COLORS["Other"]}`}>
            🎧 {audiobook.category}
          </span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
            isFree ? "bg-emerald-500 text-white" : isPurchased ? "bg-blue-500 text-white" : "bg-orange-500 text-white"
          }`}>
            {isFree ? "FREE" : isPurchased ? "OWNED" : `MK ${Number(audiobook.price).toLocaleString()}`}
          </span>
        </div>

        {/* Mini play/pause — bottom right */}
        <button
          onClick={togglePlay}
          className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full text-white active:scale-90 transition-transform shadow-md"
          style={{ background: "linear-gradient(135deg,#db2777,#7c3aed)" }}
        >
          {loadingUrl ? <Loader2 className="w-3 h-3 animate-spin" />
            : playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {playing ? "Pause" : "Play"}
        </button>

        {/* In-progress scrubber sliver along the bottom edge */}
        {playing && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div className="h-full bg-white/80 transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
          style={{ background: "linear-gradient(to top,rgba(0,0,0,0.3) 0%,transparent 100%)" }} />
      </div>

      {/* ── Card body ── */}
      <div className="p-2.5 flex flex-col gap-2 flex-1">
        <h3 className="font-bold text-xs text-foreground line-clamp-2 leading-snug">{audiobook.title}</h3>

        {(audiobook.author || audiobook.narrator) && (
          <p className="text-[9px] text-muted-foreground line-clamp-1">
            {audiobook.author && <>By {audiobook.author}</>}
            {audiobook.author && audiobook.narrator && " · "}
            {audiobook.narrator && <span className="inline-flex items-center gap-0.5"><Mic2 className="w-2.5 h-2.5" />{audiobook.narrator}</span>}
          </p>
        )}

        {hasRating ? (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-[10px] font-bold text-foreground">{Number(audiobook.avg_rating).toFixed(1)}</span>
            <span className="text-[9px] text-muted-foreground">({audiobook.review_count})</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-muted-foreground/40" />
            <span className="text-[9px] text-muted-foreground/50">No reviews yet</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <span>{formatDuration(audiobook.duration_seconds)}</span>
          <span className="opacity-30">·</span>
          <Download className="w-2.5 h-2.5" />
          <span>{audiobook.download_count > 0 ? audiobook.download_count : "0"}</span>
        </div>

        <div className="mt-auto pt-1">
          {canAccess ? (
            <button
              onClick={e => { e.stopPropagation(); onDownload(audiobook); }}
              className="w-full flex items-center justify-center gap-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-[10px] font-bold py-2 rounded-lg active:scale-[0.98] transition-all shadow-sm shadow-pink-500/20"
            >
              <Download className="w-3 h-3" /> Download
            </button>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); onBuy(audiobook); }}
              className="w-full flex items-center justify-center gap-1 bg-gradient-to-r from-orange-500 to-pink-600 text-white text-[10px] font-bold py-2 rounded-lg active:scale-[0.98] transition-all shadow-sm shadow-orange-500/20"
            >
              <Lock className="w-3 h-3" /> Buy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
