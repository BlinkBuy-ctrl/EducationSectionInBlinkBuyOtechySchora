import { useEffect, useMemo, useState } from "react";
import { BookOpen, Loader2, Store, ArrowRight, ShieldCheck, UserCircle2 } from "lucide-react";
import { getApprovedBookshops, subscribeToPush, type Bookshop } from "@/lib/bookshops";
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

// "Big storefront" card — banner as background, logo overlapping top-left,
// bold name + motto over a dark gradient, Visit Shop CTA bottom-right.
function StorefrontCard({ shop, onOpen }: { shop: Bookshop; onOpen: (s: Bookshop) => void }) {
  const [bannerFailed, setBannerFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const showBanner = !!shop.banner_url && !bannerFailed;
  const showLogo = !!shop.logo_url && !logoFailed;
  const accent = shop.brand_color || "#7c3aed";

  return (
    <div
      onClick={() => onOpen(shop)}
      className="relative w-full rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all border border-border"
      style={{ height: 168, background: showBanner ? undefined : `linear-gradient(135deg, ${accent}, #1e1b4b)` }}
    >
      {showBanner && (
        <img src={shop.banner_url!} alt="" className="absolute inset-0 w-full h-full object-cover" onError={() => setBannerFailed(true)} />
      )}
      {/* Dark overlay so text stays readable over any banner */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%)" }} />

      {/* Logo, overlapping top-left */}
      <div className="absolute top-3 left-3 w-14 h-14 rounded-full border-2 border-white/80 bg-card flex items-center justify-center overflow-hidden shadow-lg">
        {showLogo ? (
          <img src={shop.logo_url!} alt={shop.name} className="w-full h-full object-cover" onError={() => setLogoFailed(true)} />
        ) : (
          <Store className="w-6 h-6 text-purple-400" />
        )}
      </div>

      {/* Verified badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-green-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full">
        <ShieldCheck className="w-3 h-3" /> Verified
      </div>

      {/* Name + motto */}
      <div className="absolute left-3 bottom-12 right-3">
        <p className="text-white font-black text-lg leading-tight drop-shadow-sm truncate">{shop.name}</p>
        {shop.motto && <p className="text-white/85 text-xs mt-0.5 line-clamp-1">{shop.motto}</p>}
      </div>

      {/* Visit Shop CTA */}
      <div className="absolute bottom-3 right-3">
        <span className="flex items-center gap-1 bg-white/95 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-full">
          Visit Shop <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
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
  const [showOwnerPanel, setShowOwnerPanel] = useState(false);

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
        // Vertical scroll of big storefront cards — no pagination
        <div className="flex flex-col gap-3">
          {filtered.map(s => <StorefrontCard key={s.id} shop={s} onOpen={setSelected} />)}
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
