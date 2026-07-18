import { useEffect, useMemo, useState } from "react";
import { BookOpen, Loader2, Store, ArrowRight, MapPin, Star, UserCircle2 } from "lucide-react";
import { getApprovedBookshops, getShopStats, subscribeToPush, type Bookshop, type ShopStats } from "@/lib/bookshops";
import { AnimatedSearchInput } from "@/components/education/AnimatedSearchInput";
import { BookshopDetailModal } from "@/components/education/BookshopDetailModal";
import { BookshopApplyModal } from "@/components/education/BookshopApplyModal";
import { BookshopOwnerPanel } from "@/components/education/BookshopOwnerPanel";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const SHOP_SEARCH_PHRASES = [
  "Search bookshops…",
  "Search by name…",
  "Search your favorite shop…",
];

// "Digital shopping mall" storefront — a real shop building, not a profile
// card: roof/awning, signboard carrying the shop name + logo, a glass
// window showing the shop's own banner as its "interior", a shelf ledge,
// then stats + a big Visit Shop button underneath.
function StorefrontCard({ shop, stats, onOpen }: { shop: Bookshop; stats?: ShopStats; onOpen: (s: Bookshop) => void }) {
  const [bannerFailed, setBannerFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const accent = shop.brand_color || "#7c3aed";
  const showBanner = !!shop.banner_url && !bannerFailed;
  const showLogo = !!shop.logo_url && !logoFailed;

  return (
    <div onClick={() => onOpen(shop)} className="rounded-2xl overflow-hidden border border-border cursor-pointer active:scale-[0.98] transition-all bg-card">
      {/* ── Storefront building ── */}
      <div className="relative" style={{ height: 190 }}>
        {/* Roof / awning */}
        <div className="absolute top-0 left-0 right-0 h-8" style={{
          background: `repeating-linear-gradient(115deg, ${accent} 0 18px, #1e1b4b 18px 36px)`,
          clipPath: "polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%)",
        }} />

        {/* Signboard: shop name + logo, sitting right under the roof */}
        <div className="absolute top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/95 px-3 py-1.5 rounded-lg shadow-md z-10 max-w-[85%]">
          <div className="w-5 h-5 rounded-full overflow-hidden bg-muted/40 flex items-center justify-center shrink-0">
            {showLogo ? <img src={shop.logo_url!} className="w-full h-full object-cover" onError={() => setLogoFailed(true)} /> : <Store className="w-3 h-3 text-purple-500" />}
          </div>
          <p className="text-[13px] font-black truncate" style={{ color: accent }}>{shop.name}</p>
        </div>

        {/* Glass window showing the shop's "interior" (banner) */}
        <div className="absolute top-16 left-3 right-3 bottom-8 rounded-t-lg overflow-hidden border-[3px]" style={{ borderColor: accent }}>
          {showBanner ? (
            <img src={shop.banner_url!} alt="" className="w-full h-full object-cover" onError={() => setBannerFailed(true)} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ background: `linear-gradient(160deg, ${accent}22, #1e1b4b11)` }}>
              <BookOpen className="w-8 h-8" style={{ color: accent }} />
            </div>
          )}
          {/* faint glass reflection */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(120deg, rgba(255,255,255,0.18) 0%, transparent 40%)" }} />
        </div>

        {/* Shelf ledge under the window */}
        <div className="absolute bottom-0 left-0 right-0 h-8" style={{ background: accent }} />
        {shop.motto && (
          <p className="absolute bottom-1.5 left-3 right-3 text-white text-[11px] font-semibold text-center truncate drop-shadow-sm">{shop.motto}</p>
        )}
      </div>

      {/* ── Info strip below the storefront ── */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-yellow-500 font-bold">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            {stats?.avgRating ? `${stats.avgRating} (${stats.reviewCount})` : "New"}
          </div>
          <span className="text-muted-foreground">{stats?.bookCount ?? 0} books</span>
          {shop.location && (
            <span className="flex items-center gap-1 text-muted-foreground truncate max-w-[40%]">
              <MapPin className="w-3 h-3 shrink-0" /> {shop.location}
            </span>
          )}
        </div>

        {shop.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {shop.categories.slice(0, 3).map(c => (
              <span key={c} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${accent}1a`, color: accent }}>{c}</span>
            ))}
          </div>
        )}

        <button className="w-full flex items-center justify-center gap-1.5 font-bold text-sm py-2 rounded-xl text-white" style={{ background: accent }}>
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

  const load = async () => {
    setLoading(true);
    try {
      const list = await getApprovedBookshops();
      setShops(list);
      setStats(await getShopStats(list.map(s => s.id)));
    } catch (e: any) { toast({ title: "Failed to load bookshops", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); subscribeToPush(user.id).catch(() => {}); }, []);

  const filtered = shops.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const suggestionPool = useMemo(() => shops.map(s => s.name), [shops]);

  return (
    <div className="flex flex-col gap-4">
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
        // Vertical "street" of storefronts — scroll down for more, no pagination
        <div className="flex flex-col gap-4">
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
