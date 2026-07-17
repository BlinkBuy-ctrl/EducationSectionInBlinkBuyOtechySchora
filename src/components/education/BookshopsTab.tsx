import { useEffect, useMemo, useState } from "react";
import { BookOpen, Loader2, Store } from "lucide-react";
import { getApprovedBookshops, subscribeToPush, type Bookshop } from "@/lib/bookshops";
import { useAuth } from "@/hooks/useAuth";
import { AnimatedSearchInput } from "@/components/education/AnimatedSearchInput";
import { BookshopDetailModal } from "@/components/education/BookshopDetailModal";
import { BookshopApplyModal } from "@/components/education/BookshopApplyModal";
import { useToast } from "@/hooks/use-toast";

const SHOP_SEARCH_PHRASES = [
  "Search bookshops…",
  "Search by name…",
  "Search your favorite shop…",
];

function BookshopCard({ shop, onOpen }: { shop: Bookshop; onOpen: (s: Bookshop) => void }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showLogo = !!shop.logo_url && !imgFailed;
  return (
    <div
      onClick={() => onOpen(shop)}
      className="flex flex-col items-center gap-2.5 bg-card border border-border rounded-2xl p-5 active:scale-[0.97] transition-all cursor-pointer"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
    >
      <div className="w-20 h-20 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
        {showLogo ? (
          <img src={shop.logo_url!} alt={shop.name} className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
        ) : (
          <Store className="w-9 h-9 text-purple-400" />
        )}
      </div>
      <p className="text-sm font-bold text-foreground text-center line-clamp-2 leading-snug">{shop.name}</p>
      <span className="text-[10px] font-semibold text-green-500 flex items-center gap-1">✓ Verified</span>
    </div>
  );
}

export function BookshopsTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [shops, setShops] = useState<Bookshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Bookshop | null>(null);
  const [showApply, setShowApply] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setShops(await getApprovedBookshops()); }
    catch (e: any) { toast({ title: "Failed to load bookshops", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); subscribeToPush(user.id).catch(() => {}); }, []);

  const filtered = shops.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const suggestionPool = useMemo(() => shops.map(s => s.name), [shops]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{shops.length} bookshop{shops.length !== 1 ? "s" : ""}</p>
      </div>

      <AnimatedSearchInput
        value={search} onChange={setSearch} phrases={SHOP_SEARCH_PHRASES}
        ringColorClass="focus:ring-purple-500/50" ariaLabel="Search bookshops" suggestionPool={suggestionPool}
      />

      {loading ? (
        <div className="flex justify-center py-14"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : shops.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center"><BookOpen className="w-7 h-7 text-purple-400" /></div>
          <p className="font-semibold text-foreground">No bookshops yet</p>
          <p className="text-sm text-muted-foreground">Own a real bookshop? Apply below.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center"><BookOpen className="w-7 h-7 text-purple-400" /></div>
          <p className="font-semibold text-foreground">No bookshops match</p>
          <p className="text-sm text-muted-foreground">Try a different search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(s => <BookshopCard key={s.id} shop={s} onOpen={setSelected} />)}
        </div>
      )}

      <button
        onClick={() => setShowApply(true)}
        className="flex items-center justify-center gap-1.5 text-xs font-bold text-purple-500 active:scale-[0.98] transition-all py-2"
      >
        <Store className="w-3.5 h-3.5" /> Own a bookshop? Apply to join
      </button>

      {selected && <BookshopDetailModal bookshop={selected} onClose={() => setSelected(null)} />}
      {showApply && <BookshopApplyModal onClose={() => setShowApply(false)} />}
    </div>
  );
}
