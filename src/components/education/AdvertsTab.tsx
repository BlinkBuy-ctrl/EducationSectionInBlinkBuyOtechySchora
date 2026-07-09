import { useEffect, useState } from "react";
import { Loader2, Megaphone } from "lucide-react";
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
    <div className="h-[72vh] w-full overflow-y-scroll snap-y snap-mandatory rounded-2xl space-y-3 [&>*]:h-full">
      {adverts.map(advert => (
        <AdvertCard
          key={advert.id}
          advert={advert}
          userId={userId}
          myReaction={myReactions[advert.id] ?? null}
          onReactionChange={handleReactionChange}
        />
      ))}
    </div>
  );
}
