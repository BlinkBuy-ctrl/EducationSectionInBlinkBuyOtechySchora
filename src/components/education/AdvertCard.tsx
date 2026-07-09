import { useRef, useState, useEffect } from "react";
import MuxPlayer from "@mux/mux-player-react";
import { ThumbsUp, ThumbsDown, Volume2, VolumeX, Play, Pause, Maximize, Minimize } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export type Advert = {
  id: string;
  mux_playback_id: string;
  title: string;
  description: string | null;
  like_count: number;
  dislike_count: number;
};

interface AdvertCardProps {
  advert: Advert;
  userId: string;
  myReaction: "like" | "dislike" | null;
  onReactionChange: (advertId: string, reaction: "like" | "dislike" | null, counts: { like_count: number; dislike_count: number }) => void;
}

export function AdvertCard({ advert, userId, myReaction, onReactionChange }: AdvertCardProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    p.muted = !p.muted;
    setMuted(p.muted);
  };

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (p.paused) { p.play(); setPaused(false); }
    else { p.pause(); setPaused(true); }
    setShowPauseIcon(true);
    setTimeout(() => setShowPauseIcon(false), 500);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const react = async (reaction: "like" | "dislike") => {
    if (busy) return;
    setBusy(true);

    const clearing = myReaction === reaction; // tapping the same one again removes it

    try {
      if (clearing) {
        const { error } = await supabase
          .from("otechy_reel_reactions")
          .delete()
          .eq("reel_id", advert.id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("otechy_reel_reactions")
          .upsert(
            { reel_id: advert.id, user_id: userId, reaction },
            { onConflict: "reel_id,user_id" }
          );
        if (error) throw error;
      }

      const { data, error: refetchError } = await supabase
        .from("otechy_reels")
        .select("like_count,dislike_count")
        .eq("id", advert.id)
        .single();
      if (refetchError) throw refetchError;

      onReactionChange(advert.id, clearing ? null : reaction, data);
    } catch (e: any) {
      toast({ title: "Couldn't save your reaction", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full snap-start shrink-0 bg-black rounded-2xl overflow-hidden">
      {/* Tap anywhere on the video to play/pause */}
      <div className="absolute inset-0 z-10" onClick={togglePlay}>
        <MuxPlayer
          ref={playerRef}
          playbackId={advert.mux_playback_id}
          streamType="on-demand"
          loop
          autoPlay="muted"
          muted
          playsInline
          style={{ width: "100%", height: "100%", "--controls": "none" } as React.CSSProperties & Record<`--${string}`, string>}
        />
      </div>

      {/* Center pause/play flash icon */}
      {showPauseIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
            {paused ? <Play className="w-7 h-7 text-white" /> : <Pause className="w-7 h-7 text-white" />}
          </div>
        </div>
      )}

      {/* Top-right: mute + fullscreen */}
      <div className="absolute top-3 right-3 flex flex-col items-center gap-2 z-30">
        <button
          onClick={(e) => { e.stopPropagation(); toggleMute(); }}
          className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md bg-black/40 text-white"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
          className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md bg-black/40 text-white"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>

      {/* Title / description overlay */}
      <div className="absolute left-0 right-16 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none z-20">
        <p className="text-white font-bold text-sm">{advert.title}</p>
        {advert.description && <p className="text-white/80 text-xs mt-0.5 line-clamp-2">{advert.description}</p>}
      </div>

      {/* Floating like/dislike overlay */}
      <div className="absolute right-3 bottom-6 flex flex-col items-center gap-4 z-30">
        <button
          onClick={(e) => { e.stopPropagation(); react("like"); }}
          disabled={busy}
          className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${
            myReaction === "like" ? "bg-blue-600 text-white" : "bg-black/40 text-white"
          }`}
        >
          <ThumbsUp className="w-5 h-5" />
        </button>
        <span className="text-white text-[11px] font-semibold -mt-3">{advert.like_count}</span>

        <button
          onClick={(e) => { e.stopPropagation(); react("dislike"); }}
          disabled={busy}
          className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${
            myReaction === "dislike" ? "bg-red-600 text-white" : "bg-black/40 text-white"
          }`}
        >
          <ThumbsDown className="w-5 h-5" />
        </button>
        <span className="text-white text-[11px] font-semibold -mt-3">{advert.dislike_count}</span>
      </div>
    </div>
  );
}
