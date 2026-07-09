import { useEffect, useRef, useState } from "react";
import { Loader2, Megaphone, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { AdvertCard, type Advert } from "@/components/education/AdvertCard";

interface AdvertsTabProps {
  userId: string;
}

export function AdvertsTab({ userId }: AdvertsTabProps) {
  const { toast } = useToast();
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [myReactions, setMyReactions] = useState<Record<string, "like" | "dislike">>({});
  const [loading, setLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: advertRows, error: advertError } = await supabase
        .from("otechy_reels")
        .select("id,mux_playback_id,title,description,like_count,dislike_count")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (advertError) {
        toast({ title: "Failed to load adverts", description: advertError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      const rows = (advertRows || []) as Advert[];
      setAdverts(rows);

      if (rows.length > 0) {
        const { data: reactionRows } = await supabase
          .from("otechy_reel_reactions")
          .select("reel_id,reaction")
          .eq("user_id", userId)
          .in("reel_id", rows.map(r => r.id));

        const map: Record<string, "like" | "dislike"> = {};
        (reactionRows || []).forEach((r: any) => { map[r.reel_id] = r.reaction; });
        setMyReactions(map);
      }

      setLoading(false);
    };
    load();
  }, [userId]);

  // Default the first video to "active" as soon as the list loads
  useEffect(() => {
    if (adverts.length > 0 && activeId === null) {
      setActiveId(adverts[0].id);
    }
  }, [adverts, activeId]);

  // Watches which card is actually visible in the scroll container and marks
  // it "active" — this is what tells AdvertCard which one should be playing.
  useEffect(() => {
    if (!containerRef.current || adverts.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const id = entry.target.getAttribute("data-advert-id");
            if (id) setActiveId(id);
          }
        });
      },
      { root: containerRef.current, threshold: [0.6] }
    );

    Object.values(cardRefs.current).forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [adverts]);

  const handleReactionChange = (
    advertId: string,
    reaction: "like" | "dislike" | null,
    counts: { like_count: number; dislike_count: number }
  ) => {
    setAdverts(prev => prev.map(a => a.id === advertId ? { ...a, ...counts } : a));
    setMyReactions(prev => {
      const next = { ...prev };
      if (reaction) next[advertId] = reaction;
      else delete next[advertId];
      return next;
    });
  };

  const scrollToId = (id: string | null) => {
    if (!id) return;
    cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const activeIndex = adverts.findIndex(a => a.id === activeId);
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex >= 0 && activeIndex < adverts.length - 1;

  const goPrev = () => { if (canGoPrev) scrollToId(adverts[activeIndex - 1].id); };
  const goNext = () => { if (canGoNext) scrollToId(adverts[activeIndex + 1].id); };

  if (loading) {
    return <div className="flex justify-center py-14"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  if (adverts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center"><Megaphone className="w-7 h-7 text-purple-400" /></div>
        <p className="font-semibold text-foreground">No adverts yet</p>
        <p className="text-sm text-muted-foreground">Check back soon for school adverts.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        className="h-[72vh] w-full overflow-y-scroll snap-y snap-mandatory rounded-2xl [&>*]:h-full"
      >
        {adverts.map(advert => (
          <div
            key={advert.id}
            ref={el => { cardRefs.current[advert.id] = el; }}
            data-advert-id={advert.id}
            className="h-full snap-start"
          >
            <AdvertCard
              advert={advert}
              userId={userId}
              myReaction={myReactions[advert.id] ?? null}
              onReactionChange={handleReactionChange}
              isActive={advert.id === activeId}
            />
          </div>
        ))}
      </div>

      {/* Up/down nav for people who'd rather tap than swipe */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-30">
        <button
          onClick={goPrev}
          disabled={!canGoPrev}
          className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md bg-black/40 text-white disabled:opacity-30 transition-opacity"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <button
          onClick={goNext}
          disabled={!canGoNext}
          className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md bg-black/40 text-white disabled:opacity-30 transition-opacity"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
