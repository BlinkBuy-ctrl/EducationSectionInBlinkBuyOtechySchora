import { useState, useEffect, useContext } from "react";
import { useLocation, Link } from "wouter";
import {
  GraduationCap, BookOpen, Upload, Award, Search,
  X, Download, TrendingUp, Users, FileText, LogIn, Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthContext } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ResourceCard } from "@/components/education/ResourceCard";
import { UploadModal } from "@/components/education/UploadModal";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATS = ["All", "Past Papers", "Textbooks", "Notes", "Research", "Other"] as const;
type PriceFilter = "all" | "free" | "paid";
type Tab = "resources" | "scholarships";

// ─── Locked screen shown to guests ────────────────────────────────────────────
function GuestWall() {
  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-5 py-24 px-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
        <GraduationCap className="w-10 h-10 text-white" />
      </div>
      <div>
        <h2 className="text-xl font-black text-foreground">OtechySchora</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Sign in to access resources, scholarships, and the student marketplace.
        </p>
      </div>
      {/* Use the app's existing login — no separate auth here */}
      <Link
        href="/login"
        className="flex items-center justify-center gap-2 w-full max-w-xs bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] shadow-md"
      >
        <LogIn className="w-4 h-4" />
        Sign In to Continue
      </Link>
      <p className="text-xs text-muted-foreground">
        No account?{" "}
        <Link href="/register" className="text-purple-500 font-semibold hover:underline">
          Create one here
        </Link>
      </p>
    </div>
  );
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────
function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-48 rounded-2xl bg-muted/50 animate-pulse" />
      ))}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function EducationPage() {
  const { user, isLoading: authLoading } = useContext(AuthContext);
  const { toast } = useToast();

  const [resources,    setResources]    = useState<any[]>([]);
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [purchases,    setPurchases]    = useState<Set<string>>(new Set());
  const [dataLoading,  setDataLoading]  = useState(false);

  const [showUpload,  setShowUpload]  = useState(false);
  const [search,      setSearch]      = useState("");
  const [catFilter,   setCatFilter]   = useState<typeof CATS[number]>("All");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [tab,         setTab]         = useState<Tab>("resources");

  // ── Fetch all data (only when user is logged in) ───────────────────────────
  // ── Fetch all data (only when user is logged in) ───────────────────────────
  const fetchAll = async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const tableNotFound = (e: any) =>
        e?.code === "42P01" || e?.message?.includes("does not exist");

      const [rRes, sRes, pRes] = await Promise.all([
        supabase
          .from("otechy_resources")
          .select("*")
          // NOTE: .eq("is_approved", true) removed — column does not exist in schema yet.
          // Add it back after running the otechy migration SQL below.
          .order("created_at", { ascending: false }),

        supabase
          .from("otechy_scholarships")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),

        supabase
          .from("otechy_purchases")
          .select("resource_id")
          .eq("buyer_id", user.id),
      ]);

      // If tables don't exist yet (pre-migration), treat as empty — don't throw
      if (rRes.error && !tableNotFound(rRes.error)) throw rRes.error;
      if (sRes.error && !tableNotFound(sRes.error)) throw sRes.error;

      setResources(rRes.data ?? []);
      setScholarships(sRes.data ?? []);
      setPurchases(new Set((pRes.data ?? []).map((p: any) => p.resource_id)));
    } catch (e: any) {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
    } finally {
      setDataLoading(false); // ALWAYS fires — prevents infinite spinner
    }
  };

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  // ── Derived: filtered resources ────────────────────────────────────────────
  const filtered = resources.filter(r => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.title.toLowerCase().includes(q) ||
      (r.description ?? "").toLowerCase().includes(q);
    const matchCat   = catFilter === "All" || r.category === catFilter;
    const matchPrice =
      priceFilter === "all" ||
      (priceFilter === "free" ? Number(r.price) === 0 : Number(r.price) > 0);
    return matchSearch && matchCat && matchPrice;
  });

  // ── Buy flow — records purchase, then unlocks download ────────────────────
  const handleBuy = async (resource: any) => {
    // user is guaranteed here (guest sees GuestWall)
    const confirmed = window.confirm(
      `Purchase "${resource.title}" for MK ${Number(resource.price).toLocaleString()}?\n\nYour payment will be processed via your registered payment method.`
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("otechy_purchases").insert({
        buyer_id:    user!.id,
        resource_id: resource.id,
        amount_paid: resource.price,
      });
      if (error) throw error;

      // Optimistic update — unlock instantly
      setPurchases(prev => new Set([...prev, resource.id]));
      toast({ title: "✅ Purchase successful!", description: "You can now download this resource." });
    } catch (e: any) {
      // Handle duplicate (already bought)
      if (e.message?.includes("unique") || e.code === "23505") {
        setPurchases(prev => new Set([...prev, resource.id]));
        toast({ title: "Already purchased", description: "You already own this resource." });
      } else {
        toast({ title: "Purchase failed", description: e.message, variant: "destructive" });
      }
    }
  };

  // ── Download flow — generate 60s signed URL ───────────────────────────────
  const handleDownload = async (resource: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("otechy-docs")
        .createSignedUrl(resource.file_url, 60); // 60s expiry for security

      if (error) throw error;

      // Non-blocking download counter increment
      supabase.rpc("increment_download", { resource_id: resource.id }).catch(() => {});

      // Trigger browser download
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = resource.file_name ?? "document";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    }
  };

  // ── Auth is still resolving (prevents flash of GuestWall) ─────────────────
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // ── Guest: show sign-in prompt — uses the app's existing /login & /register
  if (!user) return <GuestWall />;

  // ── Authenticated view ─────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 pb-28">

      {/* ─── HERO ─── */}
      <div className="relative rounded-2xl overflow-hidden bg-[hsl(215,55%,12%)] p-5 mb-6">
        {/* Decorative blobs */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/25 via-blue-600/15 to-transparent pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Brand */}
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white leading-tight tracking-tight">
                  OtechySchora
                </h1>
                <p className="text-[11px] text-purple-300 font-medium">Education Hub · Malawi</p>
              </div>
            </div>

            <p className="text-sm text-white/65 max-w-xs leading-relaxed">
              Download resources, sell your notes, and discover scholarships — all in one place.
            </p>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-3 mt-3">
              {[
                { icon: FileText, label: `${resources.length} Resources` },
                { icon: Award,    label: `${scholarships.length} Scholarships` },
                { icon: TrendingUp, label: "Growing daily" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[11px] text-white/55 font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upload CTA */}
          <button
            onClick={() => setShowUpload(true)}
            className="shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-400 hover:to-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all active:scale-[0.97] shadow-lg shadow-purple-500/30"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>
        </div>
      </div>

      {/* ─── TABS ─── */}
      <div className="flex gap-2 bg-muted/50 p-1 rounded-xl mb-5">
        {([ 
          { key: "resources",    emoji: "📚", label: "Resources",    count: resources.length },
          { key: "scholarships", emoji: "🏆", label: "Scholarships", count: scholarships.length },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-lg transition-all duration-150 ${
              tab === t.key
                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{t.emoji} {t.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? "bg-white/20" : "bg-muted"}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ─── RESOURCES TAB ─── */}
      {tab === "resources" && (
        <>
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search resources…"
              className="w-full bg-background border border-border rounded-xl pl-9 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-shadow"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Price filter */}
          <div className="flex gap-2 mb-3">
            {(["all", "free", "paid"] as PriceFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setPriceFilter(f)}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all duration-150 ${
                  priceFilter === f
                    ? "bg-purple-600 border-purple-600 text-white"
                    : "border-border text-muted-foreground hover:border-purple-400 hover:text-foreground"
                }`}
              >
                {f === "all" ? "All" : f === "free" ? "Free Only" : "Paid Only"}
              </button>
            ))}
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {CATS.map(c => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all duration-150 ${
                  catFilter === c
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-border text-muted-foreground hover:border-blue-400 hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Grid */}
          {dataLoading ? (
            <GridSkeleton />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-purple-400" />
              </div>
              <p className="font-semibold text-foreground">No resources found</p>
              <p className="text-sm text-muted-foreground">Be the first to upload one!</p>
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl mt-1 active:scale-[0.98] transition-all"
              >
                <Upload className="w-4 h-4" /> Upload Resource
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map(r => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  isPurchased={purchases.has(r.id)}
                  onBuy={handleBuy}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── SCHOLARSHIPS TAB ─── */}
      {tab === "scholarships" && (
        <div className="flex flex-col gap-3">
          {dataLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-muted/50 animate-pulse" />
            ))
          ) : scholarships.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
                <Award className="w-7 h-7 text-yellow-500" />
              </div>
              <p className="font-semibold text-foreground">No scholarships yet</p>
              <p className="text-sm text-muted-foreground">Check back soon — new listings are added regularly.</p>
            </div>
          ) : (
            scholarships.map(s => (
              <div
                key={s.id}
                className="bg-card border border-border rounded-2xl p-4 hover:shadow-md hover:shadow-yellow-500/10 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-foreground line-clamp-1">{s.title}</h3>
                      {s.amount && (
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                          {s.amount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-purple-500 font-semibold mt-0.5">{s.provider}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                    <div className="flex items-center justify-between mt-2.5">
                      {s.deadline && (
                        <span className="text-[11px] text-muted-foreground">
                          Deadline:{" "}
                          <span className="font-semibold text-foreground">
                            {new Date(s.deadline).toLocaleDateString("en-MW", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </span>
                        </span>
                      )}
                      {s.link && (
                        <a
                          href={s.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-purple-500 hover:text-purple-400 transition-colors"
                        >
                          Apply →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Upload Modal ─── */}
      {showUpload && (
        <UploadModal
          userId={user.id}
          onClose={() => setShowUpload(false)}
          onSuccess={fetchAll}
        />
      )}
    </div>
  );
}
