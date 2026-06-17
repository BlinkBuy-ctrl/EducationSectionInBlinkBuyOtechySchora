import { useState, useEffect, useContext } from "react";
import {
  GraduationCap, BookOpen, Upload, Award,
  Search, X, FileText, Bookmark, Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthContext } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ResourceCard } from "@/components/education/ResourceCard";
import { ResourceDetailModal } from "@/components/education/ResourceDetailModal";
import { UploadModal } from "@/components/education/UploadModal";
import { SellerDashboard } from "@/components/education/SellerDashboard";
import { ScholarshipsTab } from "@/components/education/ScholarshipsTab";
import { TutorsTab } from "@/components/education/TutorsTab";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";

const CATS = ["All", "Past Papers", "Textbooks", "Notes", "Research", "Other"] as const;
type PriceFilter = "all" | "free" | "paid";
type Tab = "resources" | "scholarships" | "tutors" | "bookmarks" | "dashboard";

const ONBOARDING_KEY = "otechy_onboarding_done";

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-52 rounded-2xl bg-muted/50 animate-pulse" />
      ))}
    </div>
  );
}

export default function EducationPage() {
  const { user, ensureProfile } = useContext(AuthContext);
  const { toast } = useToast();

  const [resources,    setResources]    = useState<any[]>([]);
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [tutors,       setTutors]       = useState<any[]>([]);
  const [purchases,    setPurchases]    = useState<Set<string>>(new Set());
  const [bookmarks,    setBookmarks]    = useState<Set<string>>(new Set());
  const [dataLoading,  setDataLoading]  = useState(false);

  const [showUpload,    setShowUpload]    = useState(false);
  const [detailRes,     setDetailRes]     = useState<any | null>(null);
  const [search,        setSearch]        = useState("");
  const [catFilter,     setCatFilter]     = useState<typeof CATS[number]>("All");
  const [priceFilter,   setPriceFilter]   = useState<PriceFilter>("all");
  const [tab,           setTab]           = useState<Tab>("resources");
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding once per device
  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_KEY)) {
      setTimeout(() => setShowOnboarding(true), 600);
    }
  }, []);

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setShowOnboarding(false);
  };

  // Bottom nav post button event
  useEffect(() => {
    const handler = () => handleUploadClick();
    window.addEventListener("otechy:open-upload", handler);
    return () => window.removeEventListener("otechy:open-upload", handler);
  }, []);

  // URL tab param (My Stats link)
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    if (t) setTab(t);
  }, []);

  const fetchAll = async () => {
    setDataLoading(true);
    try {
      const notFound = (e: any) => e?.code === "42P01" || e?.message?.includes("does not exist");

      // Fetch resources WITHOUT the broken join — separate uploader name lookup
      const [rRes, sRes, tRes, pRes, bRes] = await Promise.all([
        supabase
          .from("otechy_resources")
          .select("id,title,description,category,price,file_url,file_name,file_size,download_count,avg_rating,review_count,uploader_id,created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("otechy_scholarships")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("otechy_tutors")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase.from("otechy_purchases").select("resource_id").eq("buyer_id", user.id),
        supabase.from("otechy_bookmarks").select("resource_id").eq("user_id", user.id),
      ]);

      if (rRes.error && !notFound(rRes.error)) throw rRes.error;
      if (sRes.error && !notFound(sRes.error)) throw sRes.error;
      if (tRes.error && !notFound(tRes.error)) throw tRes.error;

      setResources(rRes.data ?? []);
      setScholarships(sRes.data ?? []);
      setTutors(tRes.data ?? []);
      if (!pRes?.error) setPurchases(new Set((pRes?.data ?? []).map((p: any) => p.resource_id)));
      if (!bRes?.error) setBookmarks(new Set((bRes?.data ?? []).map((b: any) => b.resource_id)));
    } catch (e: any) {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [user.id]);

  const filtered = resources.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.title?.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q);
    const matchCat    = catFilter === "All" || r.category === catFilter;
    const matchPrice  = priceFilter === "all" || (priceFilter === "free" ? Number(r.price) === 0 : Number(r.price) > 0);
    return matchSearch && matchCat && matchPrice;
  });

  const bookmarkedResources = resources.filter(r => bookmarks.has(r.id));

  const handleDownload = async (resource: any) => {
    try {
      const { data: signed, error: signErr } = await supabase.storage
        .from("otechy-docs")
        .createSignedUrl(resource.file_url, 60);
      if (signErr) throw signErr;

      const resp = await fetch(signed.signedUrl);
      if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = resource.file_name ?? "document";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);

      supabase.rpc("increment_download", { resource_id: resource.id, caller_id: user.id }).catch(() => {});
      toast({ title: "✅ Download started!" });
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    }
  };

  const handleBuy = async (resource: any) => {
    await ensureProfile();
    const confirmed = window.confirm(`Purchase "${resource.title}" for MK ${Number(resource.price).toLocaleString()}?`);
    if (!confirmed) return;
    try {
      const { error } = await supabase.from("otechy_purchases").insert({
        buyer_id: user.id, resource_id: resource.id, amount_paid: resource.price,
      });
      if (error && error.code !== "23505") throw error;
      setPurchases(prev => new Set([...prev, resource.id]));
      toast({ title: "✅ Purchase successful!" });
    } catch (e: any) {
      toast({ title: "Purchase failed", description: e.message, variant: "destructive" });
    }
  };

  const handleBookmarkToggle = async (resource: any) => {
    await ensureProfile();
    const isBookmarked = bookmarks.has(resource.id);
    try {
      if (isBookmarked) {
        await supabase.from("otechy_bookmarks").delete()
          .eq("user_id", user.id).eq("resource_id", resource.id);
        setBookmarks(prev => { const n = new Set(prev); n.delete(resource.id); return n; });
        toast({ title: "Bookmark removed" });
      } else {
        await supabase.from("otechy_bookmarks").insert({ user_id: user.id, resource_id: resource.id });
        setBookmarks(prev => new Set([...prev, resource.id]));
        toast({ title: "🔖 Bookmarked!" });
      }
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleUploadClick = async () => {
    await ensureProfile();
    setShowUpload(true);
  };

  const tabs: { key: Tab; emoji: string; label: string; count: number | null }[] = [
    { key: "resources",    emoji: "📚", label: "Browse",       count: resources.length     },
    { key: "scholarships", emoji: "🏆", label: "Scholarships", count: scholarships.length  },
    { key: "tutors",       emoji: "👨‍🏫", label: "Tutors",       count: tutors.length        },
    { key: "bookmarks",    emoji: "🔖", label: "Saved",        count: bookmarkedResources.length },
    { key: "dashboard",    emoji: "📊", label: "My Stats",     count: null                 },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 pb-28">

      {/* ── ONBOARDING ── */}
      {showOnboarding && (
        <OnboardingTutorial onDone={dismissOnboarding} onUpload={() => { dismissOnboarding(); handleUploadClick(); }} />
      )}

      {/* ── HERO ── */}
      <div className="relative rounded-2xl overflow-hidden bg-[hsl(215,55%,12%)] p-5 mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/25 via-blue-600/15 to-transparent pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white leading-tight tracking-tight">OtechySchora</h1>
                <p className="text-[11px] text-purple-300 font-medium">Education Hub · Malawi</p>
              </div>
            </div>
            <p className="text-sm text-white/65 max-w-xs leading-relaxed">
              Download resources, find tutors, and discover scholarships.
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
              {[
                { icon: FileText, label: `${resources.length} Resources`    },
                { icon: Award,    label: `${scholarships.length} Scholarships` },
                { icon: Users,    label: `${tutors.length} Tutors`          },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[11px] text-white/55 font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={handleUploadClick}
            className="shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-400 hover:to-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all active:scale-[0.97] shadow-lg shadow-purple-500/30"
          >
            <Upload className="w-3.5 h-3.5" /> Upload
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-1.5 bg-muted/50 p-1 rounded-xl mb-5 overflow-x-auto scrollbar-hide">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 flex items-center justify-center gap-1 text-xs font-semibold py-2 px-3 rounded-lg transition-all duration-150 ${
              tab === t.key
                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{t.emoji} {t.label}</span>
            {t.count !== null && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? "bg-white/20" : "bg-muted"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── BROWSE ── */}
      {tab === "resources" && (
        <>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search resources…"
              className="w-full bg-background border border-border rounded-xl pl-9 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-shadow"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 mb-3">
            {(["all", "free", "paid"] as PriceFilter[]).map(f => (
              <button key={f} onClick={() => setPriceFilter(f)}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${priceFilter === f ? "bg-purple-600 border-purple-600 text-white" : "border-border text-muted-foreground"}`}>
                {f === "all" ? "All" : f === "free" ? "Free Only" : "Paid Only"}
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {CATS.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${catFilter === c ? "bg-blue-600 border-blue-600 text-white" : "border-border text-muted-foreground"}`}>
                {c}
              </button>
            ))}
          </div>

          {dataLoading ? <GridSkeleton /> : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-purple-400" />
              </div>
              <p className="font-semibold text-foreground">No resources found</p>
              <p className="text-sm text-muted-foreground">Be the first to upload one!</p>
              <button onClick={handleUploadClick}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl mt-1 active:scale-[0.98] transition-all">
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
                  onOpen={setDetailRes}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "scholarships" && (
        <ScholarshipsTab scholarships={scholarships} loading={dataLoading} user={user} onRefresh={fetchAll} />
      )}

      {tab === "tutors" && (
        <TutorsTab tutors={tutors} loading={dataLoading} user={user} onRefresh={fetchAll} />
      )}

      {tab === "bookmarks" && (
        <>
          {bookmarkedResources.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                <Bookmark className="w-7 h-7 text-purple-400" />
              </div>
              <p className="font-semibold text-foreground">No saved resources</p>
              <p className="text-sm text-muted-foreground">Tap the bookmark icon on any resource.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {bookmarkedResources.map(r => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  isPurchased={purchases.has(r.id)}
                  onBuy={handleBuy}
                  onDownload={handleDownload}
                  onOpen={setDetailRes}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "dashboard" && (
        <SellerDashboard userId={user.id} onRefresh={fetchAll} />
      )}

      {showUpload && (
        <UploadModal userId={user.id} onClose={() => setShowUpload(false)} onSuccess={fetchAll} />
      )}

      {detailRes && (
        <ResourceDetailModal
          resource={detailRes}
          isPurchased={purchases.has(detailRes.id)}
          isBookmarked={bookmarks.has(detailRes.id)}
          onClose={() => setDetailRes(null)}
          onBuy={handleBuy}
          onDownload={handleDownload}
          onBookmarkToggle={handleBookmarkToggle}
        />
      )}
    </div>
  );
}
