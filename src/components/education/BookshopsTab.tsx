import { useEffect, useMemo, useState } from "react";
import { BookOpen, Loader2, Store, ArrowRight, MapPin, Star, UserCircle2 } from "lucide-react";
import { getApprovedBookshops, getShopStats, subscribeToPush, type Bookshop, type ShopStats } from "@/lib/bookshops";
import { AnimatedSearchInput } from "@/components/education/AnimatedSearchInput";
import { BookshopDetailModal } from "@/components/education/BookshopDetailModal";
import { BookshopApplyModal } from "@/components/education/BookshopApplyModal";
import { BookshopOwnerPanel } from "@/components/education/BookshopOwnerPanel";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getCache, setCache } from "@/lib/offlineCache";

const SHOP_SEARCH_PHRASES = [
  "Search bookshops…",
  "Search by name…",
  "Search your favorite shop…",
];

// ── Cached row shapes ────────────────────────────────────────────────────
// ShopStats has no natural "id", so it's cached as a flat row per shop with
// the shop's own id as the key — converted back to a Record on read.
type CachedStatRow = ShopStats & { id: string };

function statsRecordToRows(stats: Record<string, ShopStats>): CachedStatRow[] {
  return Object.entries(stats).map(([id, s]) => ({ id, ...s }));
}
function statsRowsToRecord(rows: CachedStatRow[]): Record<string, ShopStats> {
  const rec: Record<string, ShopStats> = {};
  for (const { id, ...s } of rows) rec[id] = s;
  return rec;
}

function StorefrontCard({ shop, stats, onOpen }: { shop: Bookshop; stats?: ShopStats; onOpen: (s: Bookshop) => void }) {
  const accent = shop.brand_color || "#7c3aed";

  return (
    <div
      onClick={() => onOpen(shop)}
      className="relative rounded-2xl border border-border bg-card pt-6 cursor-pointer active:scale-[0.98] transition-all"
    >
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 max-w-[85%] bg-card border border-border rounded-xl px-4 py-2 shadow-sm">
        <p className="text-sm font-black text-foreground truncate">{shop.name}</p>
      </div>

      <div
        className="mx-3 rounded-xl flex items-center justify-center"
        style={{ height: 140, background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
      >
        <Store className="w-16 h-16 text-white" strokeWidth={1.5} />
      </div>

      <div className="p-4 space-y-3">
        {shop.motto && <p className="text-xs text-muted-foreground text-center">{shop.motto}</p>}

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 font-bold" style={{ color: stats?.avgRating ? "#eab308" : undefined }}>
            <Star className="w-3.5 h-3.5" style={stats?.avgRating ? { fill: "#facc15", color: "#facc15" } : {}} />
            {stats?.avgRating ? `${stats.avgRating} (${stats.reviewCount})` : "New"}
          </span>
          <span className="text-muted-foreground">{stats?.bookCount ?? 0} book{stats?.bookCount === 1 ? "" : "s"}</span>
          {shop.location && (
            <span className="flex items-center gap-1 text-muted-foreground truncate max-w-[35%]">
              <MapPin className="w-3 h-3 shrink-0" /> {shop.location}
            </span>
          )}
        </div>

        {shop.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {shop.categories.slice(0, 3).map(c => (
              <span key={c} className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${accent}1a`, color: accent }}>{c}</span>
            ))}
          </div>
        )}

        <button
          className="w-full flex items-center justify-center gap-1.5 font-bold text-sm py-2.5 rounded-xl text-white"
          style={{ background: accent }}
        >
          Visit Shop <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function BookshopsTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [shops, setShops] = useState<Bookshop[]>([]);
  const [stats, setStats] = useState<Record<string, ShopStats>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Bookshop | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [showOwnerPanel, setShowOwnerPanel] = useState(false);

  // ── OFFLINE-FIRST: cached shops + stats show immediately, then a live
  // Supabase fetch refreshes both and re-populates the cache.
  const load = async () => {
    const [cachedShops, cachedStatRows] = await Promise.all([
      getCache<Bookshop>("bookshops"),
      getCache<CachedStatRow>("bookshop_stats"),
    ]);
    if (cachedShops.length) {
      setShops(cachedShops);
      setStats(statsRowsToRecord(cachedStatRows));
      setLoading(false);
    }

    try {
      const list = await getApprovedBookshops();
      setShops(list);
      setCache("bookshops", list);

      const freshStats = await getShopStats(list.map(s => s.id));
      setStats(freshStats);
      setCache("bookshop_stats", statsRecordToRows(freshStats));
    } catch (e: any) {
      if (navigator.onLine) {
        toast({ title: "Failed to load bookshops", description: e.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    subscribeToPush(user.id).catch(() => {});
  }, []);

  // Re-sync automatically the instant connectivity returns.
  useEffect(() => {
    const handler = () => { load(); };
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = shops.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const suggestionPool = useMemo(() => shops.map(s => s.name), [shops]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{shops.length} bookshop{shops.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setShowOwnerPanel(true)} className="flex items-center gap-1 text-xs font-bold text-purple-500">
          <UserCircle2 className="w-3.5 h-3.5" /> My Bookshop
        </button>
      </div>

      <AnimatedSearchInput
        value={search} onChange={setSearch} phrases={SHOP_SEARCH_PHRASES}
        ringColorClass="focus:ring-purple-500/50" ariaLabel="Search bookshops" suggestionPool={suggestionPool}
      />

      {loading && shops.length === 0 ? (
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
        <div className="flex flex-col gap-5">
          {filtered.map(s => <StorefrontCard key={s.id} shop={s} stats={stats[s.id]} onOpen={setSelected} />)}
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
      {showOwnerPanel && <BookshopOwnerPanel onClose={() => setShowOwnerPanel(false)} />}
    </div>
  );
}