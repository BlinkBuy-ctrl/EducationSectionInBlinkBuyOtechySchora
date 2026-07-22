import { useState, useEffect, useContext, useRef, useMemo } from "react";
import type { RefObject, MutableRefObject } from "react";
import { GraduationCap, BookOpen, Upload, Award, FileText, Bookmark, Users, Megaphone, Headphones } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { bookshopSupabase } from "@/lib/bookshopSupabase";
import { AuthContext } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AnimatedSearchInput } from "@/components/education/AnimatedSearchInput";
import { ResourceCard } from "@/components/education/ResourceCard";
import { ResourceDetailModal } from "@/components/education/ResourceDetailModal";
import { UploadModal } from "@/components/education/UploadModal";
import { AudioBookCard } from "@/components/education/AudioBookCard";
import { AudioBookDetailModal } from "@/components/education/AudioBookDetailModal";
import { AudioBookUploadModal } from "@/components/education/AudioBookUploadModal";
import { SellerDashboard } from "@/components/education/SellerDashboard";
import { ScholarshipsTab } from "@/components/education/ScholarshipsTab";
import { TutorsTab } from "@/components/education/TutorsTab";
import { AdvertsTab } from "@/components/education/AdvertsTab";
import { UniversitiesTab } from "@/components/education/UniversitiesTab";
import { BookshopsTab } from "@/components/education/BookshopsTab";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import AboutUs from "@/components/education/AboutUs";
import { safeGetItem, safeSetItem } from "@/lib/storage";
import { getCache, setCache } from "@/lib/offlineCache";
import {
  AudioBook, AUDIOBOOK_CATEGORIES, TABLE_AUDIOBOOKS,
  TABLE_AUDIOBOOK_PURCHASES, TABLE_AUDIOBOOK_BOOKMARKS,
  getSignedAudioUrl,
} from "@/lib/audiobooks";

const CATS = ["All", "Past Papers", "Textbooks", "Notes", "Research", "Other"] as const;
const ACATS = ["All", ...AUDIOBOOK_CATEGORIES] as const;
const RESOURCE_SEARCH_PHRASES = [
  "Search Physics…", "Search Chemistry…", "Search Agriculture…", "Search Mathematics…",
  "Search Biology…", "Search Past Papers…", "Search Textbooks…",
];
const AUDIO_SEARCH_PHRASES = [
  "Search Fiction…", "Search Educational…", "Search by author…", "Search by narrator…", "Search Audio Books…",
];
type PriceFilter = "all" | "free" | "paid";
type ContentType = "documents" | "audio";
type Tab = "resources" | "scholarships" | "tutors" | "universities" | "bookshops" | "adverts" | "bookmarks" | "dashboard" | "aboutus";
const ONBOARDING_KEY = "otechy_onboarding_done";
const TAB_HINT_ANIM_KEY = "otechy_tab_hint_anim_enabled";
const CAT_HINT_ANIM_KEY = "otechy_cat_hint_anim_enabled";

function useScrollHintAnimation(ref: RefObject<HTMLDivElement>, enabled: boolean) {
  const pausedRef = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let dir = 1;
    const SPEED = 0.35;
    let resumeTimeout: ReturnType<typeof setTimeout> | null = null;
    const step = () => {
      if (enabled && !pausedRef.current) {
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll > 4) {
          let next = el.scrollLeft + SPEED * dir;
          if (next >= maxScroll) { next = maxScroll; dir = -1; }
          else if (next <= 0) { next = 0; dir = 1; }
          el.scrollLeft = next;
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const pause = () => {
      pausedRef.current = true;
      if (resumeTimeout) clearTimeout(resumeTimeout);
      resumeTimeout = setTimeout(() => { pausedRef.current = false; }, 2500);
    };
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("mousedown", pause);
    el.addEventListener("wheel", pause, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      if (resumeTimeout) clearTimeout(resumeTimeout);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("mousedown", pause);
      el.removeEventListener("wheel", pause);
    };
  }, [enabled, ref]);
}

function handleTripleTap(stateRef: MutableRefObject<{ count: number; timer: ReturnType<typeof setTimeout> | null }>, onTriple: () => void) {
  const state = stateRef.current;
  state.count += 1;
  if (state.timer) clearTimeout(state.timer);
  if (state.count >= 3) {
    state.count = 0;
    onTriple();
  } else {
    state.timer = setTimeout(() => { state.count = 0; }, 650);
  }
}

function Skeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-48 rounded-2xl skeleton" />
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
  const [loading,      setLoading]      = useState(false);
  const [showUpload,   setShowUpload]   = useState(false);
  const [detailRes,    setDetailRes]    = useState<any>(null);
  const [search,       setSearch]       = useState("");
  const [cat,          setCat]          = useState<typeof CATS[number]>("All");
  const [price,        setPrice]        = useState<PriceFilter>("all");
  const [tab,          setTab]          = useState<Tab>("resources");
  const [showOnboard,  setShowOnboard]  = useState(false);

  const [audiobooks,         setAudiobooks]         = useState<AudioBook[]>([]);
  const [audiobookPurchases, setAudiobookPurchases] = useState<Set<string>>(new Set());
  const [audiobookBookmarks, setAudiobookBookmarks] = useState<Set<string>>(new Set());
  const [contentType,        setContentType]        = useState<ContentType>("documents");
  const [audiobookCat,       setAudiobookCat]       = useState<typeof ACATS[number]>("All");
  const [showAudioUpload,    setShowAudioUpload]    = useState(false);
  const [detailAudiobook,    setDetailAudiobook]    = useState<AudioBook | null>(null);

  const handleUploadClickRef = useRef<() => Promise<void>>(async () => {});

  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const catsScrollRef = useRef<HTMLDivElement>(null);

  const [tabHintEnabled, setTabHintEnabled] = useState(() => {
    const saved = safeGetItem(TAB_HINT_ANIM_KEY);
    return saved === null ? true : saved === "1";
  });
  const [catHintEnabled, setCatHintEnabled] = useState(() => {
    const saved = safeGetItem(CAT_HINT_ANIM_KEY);
    return saved === null ? true : saved === "1";
  });

  useScrollHintAnimation(tabsScrollRef, tabHintEnabled);
  useScrollHintAnimation(catsScrollRef, catHintEnabled);

  const tabsTapState = useRef({ count: 0, timer: null as ReturnType<typeof setTimeout> | null });
  const catsTapState = useRef({ count: 0, timer: null as ReturnType<typeof setTimeout> | null });

  const handleTabBarTap = () => handleTripleTap(tabsTapState, () => {
    setTabHintEnabled(prev => {
      const next = !prev;
      safeSetItem(TAB_HINT_ANIM_KEY, next ? "1" : "0");
      toast({ title: next ? "↔️ Tab scroll hint on" : "↔️ Tab scroll hint off" });
      return next;
    });
  });

  const handleCatsBarTap = () => handleTripleTap(catsTapState, () => {
    setCatHintEnabled(prev => {
      const next = !prev;
      safeSetItem(CAT_HINT_ANIM_KEY, next ? "1" : "0");
      toast({ title: next ? "↔️ Category scroll hint on" : "↔️ Category scroll hint off" });
      return next;
    });
  });

  useEffect(() => {
    const tabHandler = (e: Event) => {
      const t = (e as CustomEvent).detail as Tab;
      setTab(t);
    };
    const uploadHandler = () => { handleUploadClickRef.current(); };
    window.addEventListener("otechy:set-tab", tabHandler);
    window.addEventListener("otechy:open-upload", uploadHandler);
    return () => {
      window.removeEventListener("otechy:set-tab", tabHandler);
      window.removeEventListener("otechy:open-upload", uploadHandler);
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      setTab("resources");
      setTimeout(() => setShowOnboard(true), 300);
    };
    window.addEventListener("otechy:start-tutorial", handler);
    return () => window.removeEventListener("otechy:start-tutorial", handler);
  }, []);

  useEffect(() => {
    if (showUpload || showAudioUpload) {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prevOverflow; };
    }
  }, [showUpload, showAudioUpload]);

  // ── OFFLINE-FIRST: load cache immediately, then refresh from network ────
  const loadFromCacheFirst = async () => {
    const [
      cachedResources, cachedScholarships, cachedTutors,
      cachedPurchases, cachedBookmarks,
      cachedAudiobooks, cachedAudiobookPurchases, cachedAudiobookBookmarks,
    ] = await Promise.all([
      getCache<any>("resources"),
      getCache<any>("scholarships"),
      getCache<any>("tutors"),
      getCache<{ id: string; resource_id: string }>("purchases"),
      getCache<{ id: string; resource_id: string }>("bookmarks"),
      getCache<AudioBook>("audiobooks"),
      getCache<{ id: string; audiobook_id: string }>("audiobook_purchases"),
      getCache<{ id: string; audiobook_id: string }>("audiobook_bookmarks"),
    ]);

    if (cachedResources.length)    setResources(cachedResources);
    if (cachedScholarships.length) setScholarships(cachedScholarships);
    if (cachedTutors.length)       setTutors(cachedTutors);
    if (cachedAudiobooks.length)   setAudiobooks(cachedAudiobooks);
    if (cachedPurchases.length)    setPurchases(new Set(cachedPurchases.map(p => p.resource_id)));
    if (cachedBookmarks.length)    setBookmarks(new Set(cachedBookmarks.map(b => b.resource_id)));
    if (cachedAudiobookPurchases.length) setAudiobookPurchases(new Set(cachedAudiobookPurchases.map(p => p.audiobook_id)));
    if (cachedAudiobookBookmarks.length) setAudiobookBookmarks(new Set(cachedAudiobookBookmarks.map(b => b.audiobook_id)));
  };

  const fetchAll = async () => {
    // Show cached content immediately if this is the very first load and we
    // have nothing on screen yet — avoids a blank/loading flash on reopen.
    if (resources.length === 0 && audiobooks.length === 0) {
      await loadFromCacheFirst();
    }

    setLoading(true);
    const noTable = (e: any) => e?.code === "42P01";
    const errors: string[] = [];

    const [rRes, sRes, tRes, pRes, bRes, abRes, apRes, abmRes] = await Promise.allSettled([
      supabase.from("otechy_resources")
        .select("id,title,description,category,price,file_url,file_name,file_size,download_count,avg_rating,review_count,uploader_id,thumbnail_url,created_at")
        .order("created_at", { ascending: false }),
      supabase.from("otechy_scholarships").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("otechy_tutors").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("otechy_purchases").select("resource_id").eq("buyer_id", user.id),
      supabase.from("otechy_bookmarks").select("resource_id").eq("user_id", user.id),
      bookshopSupabase.from(TABLE_AUDIOBOOKS)
        .select("id,uploader_id,title,description,author,narrator,category,price,audio_url,audio_format,file_size,duration_seconds,cover_url,play_count,download_count,avg_rating,review_count,created_at")
        .order("created_at", { ascending: false }),
      bookshopSupabase.from(TABLE_AUDIOBOOK_PURCHASES).select("audiobook_id").eq("buyer_id", user.id),
      bookshopSupabase.from(TABLE_AUDIOBOOK_BOOKMARKS).select("audiobook_id").eq("user_id", user.id),
    ]);

    // Resources
    if (rRes.status === "fulfilled" && (!rRes.value.error || noTable(rRes.value.error))) {
      const rows = rRes.value.data ?? [];
      setResources(rows);
      setCache("resources", rows);
    } else errors.push("resources");

    // Scholarships
    if (sRes.status === "fulfilled" && (!sRes.value.error || noTable(sRes.value.error))) {
      const rows = sRes.value.data ?? [];
      setScholarships(rows);
      setCache("scholarships", rows);
    } else errors.push("scholarships");

    // Tutors
    if (tRes.status === "fulfilled" && (!tRes.value.error || noTable(tRes.value.error))) {
      const rows = tRes.value.data ?? [];
      setTutors(rows);
      setCache("tutors", rows);
    } else errors.push("tutors");

    // Audiobooks (hardcoded backend)
    if (abRes.status === "fulfilled" && (!abRes.value.error || noTable(abRes.value.error))) {
      const rows = abRes.value.data ?? [];
      setAudiobooks(rows);
      setCache("audiobooks", rows);
    } else errors.push("audiobooks");

    // Non-critical sets
    if (pRes.status === "fulfilled" && !pRes.value.error) {
      const rows = pRes.value.data ?? [];
      setPurchases(new Set(rows.map((p: any) => p.resource_id)));
      setCache("purchases", rows.map((p: any) => ({ id: p.resource_id, resource_id: p.resource_id })));
    }
    if (bRes.status === "fulfilled" && !bRes.value.error) {
      const rows = bRes.value.data ?? [];
      setBookmarks(new Set(rows.map((b: any) => b.resource_id)));
      setCache("bookmarks", rows.map((b: any) => ({ id: b.resource_id, resource_id: b.resource_id })));
    }
    if (apRes.status === "fulfilled" && !apRes.value.error) {
      const rows = apRes.value.data ?? [];
      setAudiobookPurchases(new Set(rows.map((p: any) => p.audiobook_id)));
      setCache("audiobook_purchases", rows.map((p: any) => ({ id: p.audiobook_id, audiobook_id: p.audiobook_id })));
    }
    if (abmRes.status === "fulfilled" && !abmRes.value.error) {
      const rows = abmRes.value.data ?? [];
      setAudiobookBookmarks(new Set(rows.map((b: any) => b.audiobook_id)));
      setCache("audiobook_bookmarks", rows.map((b: any) => ({ id: b.audiobook_id, audiobook_id: b.audiobook_id })));
    }

    if (errors.length && navigator.onLine) {
      toast({
        title: "Some content failed to load",
        description: `Couldn't load: ${errors.join(", ")}. The rest of the page loaded fine.`,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user.id]);

  // Re-sync automatically the moment connectivity returns — no manual
  // refresh needed from the user.
  useEffect(() => {
    const handler = () => { fetchAll(); };
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const filtered = resources.filter(r => {
    const q = search.toLowerCase();
    const mS = !q || r.title?.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q);
    const mC = cat === "All" || r.category === cat;
    const mP = price === "all" || (price === "free" ? Number(r.price) === 0 : Number(r.price) > 0);
    return mS && mC && mP;
  });

  const filteredAudiobooks = audiobooks.filter(a => {
    const q = search.toLowerCase();
    const mS = !q
      || a.title?.toLowerCase().includes(q)
      || (a.description ?? "").toLowerCase().includes(q)
      || (a.author ?? "").toLowerCase().includes(q)
      || (a.narrator ?? "").toLowerCase().includes(q);
    const mC = audiobookCat === "All" || a.category === audiobookCat;
    const mP = price === "all" || (price === "free" ? Number(a.price) === 0 : Number(a.price) > 0);
    return mS && mC && mP;
  });

  const searchSuggestions = useMemo(() => {
    if (contentType === "audio") {
      const titles = audiobooks.map(a => a.title).filter(Boolean);
      const categories = AUDIOBOOK_CATEGORIES.filter(c => c !== "All" as any);
      return [...new Set([...categories, ...titles])];
    }
    const titles = resources.map(r => r.title).filter(Boolean);
    const categories = CATS.filter(c => c !== "All");
    return [...new Set([...categories, ...titles])];
  }, [resources, audiobooks, contentType]);

  const saved = resources.filter(r => bookmarks.has(r.id));
  const savedAudiobooks = audiobooks.filter(a => audiobookBookmarks.has(a.id));

  const handleDownload = async (resource: any) => {
    try {
      const { data, error } = await supabase.storage.from("otechy-docs").createSignedUrl(resource.file_url, 60);
      if (error) throw error;
      const blob = await (await fetch(data.signedUrl)).blob();
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: resource.file_name ?? "file" });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      try {
        await supabase.rpc("increment_download", { resource_id: resource.id, caller_id: user.id });
        const { data: fresh } = await supabase
          .from("otechy_resources")
          .select("download_count,avg_rating,review_count")
          .eq("id", resource.id)
          .single();
        if (fresh) {
          setResources(prev => prev.map(r => r.id === resource.id ? { ...r, ...fresh } : r));
          if (detailRes?.id === resource.id) setDetailRes((d: any) => ({ ...d, ...fresh }));
        }
      } catch { /* non-critical — download already succeeded */ }
      toast({ title: "✅ Download started!" });
    } catch (e: any) { toast({ title: "Download failed", description: e.message, variant: "destructive" }); }
  };

  const handleBuy = async (resource: any) => {
    await ensureProfile();
    if (!window.confirm(`Purchase "${resource.title}" for MK ${Number(resource.price).toLocaleString()}?`)) return;
    try {
      const { error } = await supabase.from("otechy_purchases").insert({ buyer_id: user.id, resource_id: resource.id, amount_paid: resource.price });
      if (error && error.code !== "23505") throw error;
      setPurchases(p => new Set([...p, resource.id]));
      toast({ title: "✅ Purchase successful!" });
    } catch (e: any) { toast({ title: "Purchase failed", description: e.message, variant: "destructive" }); }
  };

  const handleBookmark = async (resource: any) => {
    await ensureProfile();
    const has = bookmarks.has(resource.id);
    try {
      if (has) {
        await supabase.from("otechy_bookmarks").delete().eq("user_id", user.id).eq("resource_id", resource.id);
        setBookmarks(p => { const n = new Set(p); n.delete(resource.id); return n; });
        toast({ title: "Bookmark removed" });
      } else {
        await supabase.from("otechy_bookmarks").insert({ user_id: user.id, resource_id: resource.id });
        setBookmarks(p => new Set([...p, resource.id]));
        toast({ title: "🔖 Bookmarked!" });
      }
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const handleAudioDownload = async (audiobook: AudioBook) => {
    try {
      const filename = `${audiobook.title}.${audiobook.audio_format ?? "mp3"}`;
      const url = await getSignedAudioUrl(audiobook.audio_url, 300, { download: filename });
      const a = Object.assign(document.createElement("a"), { href: url, download: filename });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      try {
        await bookshopSupabase.rpc("increment_audiobook_download", { audiobook_id: audiobook.id, caller_id: user.id });
        const { data: fresh } = await bookshopSupabase
          .from(TABLE_AUDIOBOOKS)
          .select("download_count,avg_rating,review_count")
          .eq("id", audiobook.id)
          .single();
        if (fresh) {
          setAudiobooks(prev => prev.map(a => a.id === audiobook.id ? { ...a, ...fresh } : a));
          if (detailAudiobook?.id === audiobook.id) setDetailAudiobook(d => (d ? { ...d, ...fresh } : d));
        }
      } catch { /* non-critical — download already succeeded */ }
      toast({ title: "✅ Download started!" });
    } catch (e: any) { toast({ title: "Download failed", description: e.message, variant: "destructive" }); }
  };

  const handleAudioBuy = async (audiobook: AudioBook) => {
    await ensureProfile();
    if (!window.confirm(`Purchase "${audiobook.title}" for MK ${Number(audiobook.price).toLocaleString()}?`)) return;
    try {
      const { error } = await bookshopSupabase.from(TABLE_AUDIOBOOK_PURCHASES).insert({
        buyer_id: user.id, audiobook_id: audiobook.id, amount_paid: audiobook.price,
      });
      if (error && error.code !== "23505") throw error;
      setAudiobookPurchases(p => new Set([...p, audiobook.id]));
      toast({ title: "✅ Purchase successful!" });
    } catch (e: any) { toast({ title: "Purchase failed", description: e.message, variant: "destructive" }); }
  };

  const handleAudioBookmark = async (audiobook: AudioBook) => {
    await ensureProfile();
    const has = audiobookBookmarks.has(audiobook.id);
    try {
      if (has) {
        await bookshopSupabase.from(TABLE_AUDIOBOOK_BOOKMARKS).delete().eq("user_id", user.id).eq("audiobook_id", audiobook.id);
        setAudiobookBookmarks(p => { const n = new Set(p); n.delete(audiobook.id); return n; });
        toast({ title: "Bookmark removed" });
      } else {
        await bookshopSupabase.from(TABLE_AUDIOBOOK_BOOKMARKS).insert({ user_id: user.id, audiobook_id: audiobook.id });
        setAudiobookBookmarks(p => new Set([...p, audiobook.id]));
        toast({ title: "🔖 Bookmarked!" });
      }
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const handleAudioPlayStart = async (audiobook: AudioBook) => {
    try {
      await bookshopSupabase.rpc("increment_audiobook_play", { audiobook_id: audiobook.id, caller_id: user.id });
    } catch { /* non-critical — playback already succeeded */ }
  };

  const handleUploadClick = async () => {
    await ensureProfile();
    if (contentType === "audio") setShowAudioUpload(true);
    else setShowUpload(true);
  };
  handleUploadClickRef.current = handleUploadClick;

  const TABS: { key: Tab; emoji: string; label: string; count: number | null }[] = [
    { key: "resources",    emoji: "📚", label: "Browse",       count: resources.length + audiobooks.length },
    { key: "scholarships", emoji: "🏆", label: "Scholarships", count: scholarships.length },
    { key: "tutors",       emoji: "👨‍🏫", label: "Tutors",       count: tutors.length       },
    { key: "universities", emoji: "🎓", label: "Higher Education", count: null            },
    { key: "bookshops",    emoji: "📖", label: "E-BookStore",     count: null            },
    { key: "adverts",      emoji: "📢", label: "Adverts",      count: null                },
    { key: "bookmarks",    emoji: "🔖", label: "Saved",        count: saved.length + savedAudiobooks.length },
    { key: "dashboard",    emoji: "📊", label: "My Stats",     count: null                },
    { key: "aboutus",      emoji: "ℹ️",  label: "About Us",     count: null                },
  ];

  return (
    <div className="px-4 py-5 pb-6 w-full max-w-lg mx-auto">

      {showOnboard && (
        <OnboardingTutorial
          onDone={() => { safeSetItem(ONBOARDING_KEY, "1"); setShowOnboard(false); }}
          onUpload={() => { safeSetItem(ONBOARDING_KEY, "1"); setShowOnboard(false); handleUploadClick(); }}
        />
      )}

      <div className="relative rounded-2xl overflow-hidden bg-[hsl(215,55%,12%)] p-4 mb-5">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/25 via-blue-600/15 to-transparent pointer-events-none" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shrink-0">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-black text-white leading-tight">SchoraHub</h1>
                <p className="text-[10px] text-purple-300 font-medium">Education Hub · Malawi</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { icon: FileText, label: `${resources.length} Resources`, onClick: () => { setTab("resources"); setContentType("documents"); } },
                { icon: Headphones, label: `${audiobooks.length} Audio Books`, onClick: () => { setTab("resources"); setContentType("audio"); } },
                { icon: Award, label: `${scholarships.length} Scholarships`, onClick: () => setTab("scholarships") },
                { icon: Users, label: `${tutors.length} Tutors`, onClick: () => setTab("tutors") },
              ].map(({ icon: Icon, label, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className="flex items-center gap-1 bg-transparent border-0 p-0 m-0 cursor-pointer active:scale-90 active:opacity-60 transition-transform duration-100"
                >
                  <Icon className="w-3 h-3 text-purple-400" />
                  <span className="text-[10px] text-white/55 font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            data-tour="upload-btn"
            onClick={handleUploadClick}
            className={`shrink-0 flex items-center gap-1.5 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all shadow-lg ${
              contentType === "audio"
                ? "bg-gradient-to-r from-pink-500 to-purple-600 shadow-pink-500/30"
                : "bg-gradient-to-r from-purple-500 to-blue-600 shadow-purple-500/30"
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Upload
          </button>
        </div>
      </div>

      <button
        onClick={() => setTab("universities")}
        className={`w-full flex items-center gap-3 rounded-2xl p-3.5 mb-5 active:scale-[0.98] transition-all border ${
          tab === "universities"
            ? "bg-gradient-to-r from-purple-600 to-blue-600 border-transparent shadow-lg shadow-purple-500/30"
            : "bg-card border-border"
        }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tab === "universities" ? "bg-white/15" : "bg-purple-500/15"}`}>
          <GraduationCap className={`w-5 h-5 ${tab === "universities" ? "text-white" : "text-purple-400"}`} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className={`text-sm font-bold ${tab === "universities" ? "text-white" : "text-foreground"}`}>Higher Education</p>
          <p className={`text-[11px] ${tab === "universities" ? "text-white/70" : "text-muted-foreground"}`}>Find your university's official links & groups</p>
        </div>
      </button>

      <button
        onClick={() => setTab("bookshops")}
        className={`w-full flex items-center gap-3 rounded-2xl p-3.5 mb-5 active:scale-[0.98] transition-all border ${
          tab === "bookshops"
            ? "bg-gradient-to-r from-purple-600 to-blue-600 border-transparent shadow-lg shadow-purple-500/30"
            : "bg-card border-border"
        }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tab === "bookshops" ? "bg-white/15" : "bg-purple-500/15"}`}>
          <BookOpen className={`w-5 h-5 ${tab === "bookshops" ? "text-white" : "text-purple-400"}`} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className={`text-sm font-bold ${tab === "bookshops" ? "text-white" : "text-foreground"}`}>E-BookStore</p>
          <p className={`text-[11px] ${tab === "bookshops" ? "text-white/70" : "text-muted-foreground"}`}>Malawi's verified bookshop marketplace</p>
        </div>
      </button>

      <div
        data-tour="tabs"
        ref={tabsScrollRef}
        onClick={handleTabBarTap}
        onTouchEnd={handleTabBarTap}
        className="flex gap-1 bg-muted/50 p-1 rounded-xl mb-4 overflow-x-auto scrollbar-hide scroll-smooth"
      >
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`shrink-0 flex items-center gap-1 text-[11px] font-semibold py-2 px-2.5 rounded-lg transition-all ${tab === t.key ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm" : "text-muted-foreground"}`}>
            {t.emoji} {t.label}
            {t.count !== null && <span className={`text-[9px] px-1 py-0.5 rounded-full font-bold ${tab === t.key ? "bg-white/20" : "bg-muted"}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === "resources" && (
        <>
          <div className="mb-3">
            <AnimatedSearchInput
              value={search}
              onChange={setSearch}
              phrases={contentType === "audio" ? AUDIO_SEARCH_PHRASES : RESOURCE_SEARCH_PHRASES}
              ringColorClass={contentType === "audio" ? "focus:ring-pink-500/50" : "focus:ring-purple-500/50"}
              ariaLabel={contentType === "audio" ? "Search audio books" : "Search resources"}
              suggestionPool={searchSuggestions}
            />
          </div>

          <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
            {(["all","free","paid"] as PriceFilter[]).map(f => (
              <button key={f} onClick={() => setPrice(f)} className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${price === f ? "bg-purple-600 border-purple-600 text-white" : "border-border text-muted-foreground"}`}>
                {f === "all" ? "All" : f === "free" ? "Free" : "Paid"}
              </button>
            ))}
            <span className="w-px bg-border shrink-0 my-0.5" />
            <button
              onClick={() => setContentType(t => (t === "documents" ? "audio" : "documents"))}
              className={`shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${
                contentType === "audio"
                  ? "bg-gradient-to-r from-pink-600 to-purple-600 border-transparent text-white shadow-sm shadow-pink-500/30"
                  : "border-border text-muted-foreground"
              }`}
            >
              <Headphones className="w-3 h-3" /> Audio
            </button>
          </div>

          <div
            ref={catsScrollRef}
            onClick={handleCatsBarTap}
            onTouchEnd={handleCatsBarTap}
            className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide scroll-smooth"
          >
            {contentType === "audio"
              ? ACATS.map(c => (
                  <button key={c} onClick={() => setAudiobookCat(c)} className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${audiobookCat === c ? "bg-pink-600 border-pink-600 text-white" : "border-border text-muted-foreground"}`}>
                    {c}
                  </button>
                ))
              : CATS.map(c => (
                  <button key={c} onClick={() => setCat(c)} className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${cat === c ? "bg-blue-600 border-blue-600 text-white" : "border-border text-muted-foreground"}`}>
                    {c}
                  </button>
                ))}
          </div>

          {contentType === "audio" ? (
            loading && filteredAudiobooks.length === 0 ? <Skeleton /> : filteredAudiobooks.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center"><Headphones className="w-7 h-7 text-pink-400" /></div>
                <p className="font-semibold text-foreground">No audio books found</p>
                <p className="text-sm text-muted-foreground">Be the first to upload one!</p>
                <button onClick={handleUploadClick} className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-all">
                  <Upload className="w-4 h-4" /> Upload Audio Book
                </button>
              </div>
            ) : (
              <div data-tour="resource-grid" className="grid grid-cols-2 gap-3">
                {filteredAudiobooks.map(a => (
                  <AudioBookCard
                    key={a.id}
                    audiobook={a}
                    isPurchased={audiobookPurchases.has(a.id)}
                    onBuy={handleAudioBuy}
                    onDownload={handleAudioDownload}
                    onOpen={setDetailAudiobook}
                    onPlayStart={handleAudioPlayStart}
                  />
                ))}
              </div>
            )
          ) : (
            loading && filtered.length === 0 ? <Skeleton /> : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center"><BookOpen className="w-7 h-7 text-purple-400" /></div>
                <p className="font-semibold text-foreground">No resources found</p>
                <p className="text-sm text-muted-foreground">Be the first to upload one!</p>
                <button onClick={handleUploadClick} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-all">
                  <Upload className="w-4 h-4" /> Upload Resource
                </button>
              </div>
            ) : (
              <div data-tour="resource-grid" className="grid grid-cols-2 gap-3">
                {filtered.map(r => <ResourceCard key={r.id} resource={r} isPurchased={purchases.has(r.id)} onBuy={handleBuy} onDownload={handleDownload} onOpen={setDetailRes} />)}
              </div>
            )
          )}
        </>
      )}

      {tab === "scholarships" && <ScholarshipsTab scholarships={scholarships} loading={loading} user={user} onRefresh={fetchAll} />}
      {tab === "tutors"       && <TutorsTab tutors={tutors} loading={loading} user={user} onRefresh={fetchAll} />}
      {tab === "universities" && <UniversitiesTab />}
      {tab === "bookshops"    && <BookshopsTab />}
      {tab === "adverts"      && <AdvertsTab userId={user.id} />}

      {tab === "bookmarks" && (
        saved.length === 0 && savedAudiobooks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center"><Bookmark className="w-7 h-7 text-purple-400" /></div>
            <p className="font-semibold">No saved items</p>
            <p className="text-sm text-muted-foreground">Tap the bookmark icon on any resource or audio book.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {saved.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Resources</h2>
                <div className="grid grid-cols-2 gap-3">
                  {saved.map(r => <ResourceCard key={r.id} resource={r} isPurchased={purchases.has(r.id)} onBuy={handleBuy} onDownload={handleDownload} onOpen={setDetailRes} />)}
                </div>
              </div>
            )}
            {savedAudiobooks.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Audio Books</h2>
                <div className="grid grid-cols-2 gap-3">
                  {savedAudiobooks.map(a => (
                    <AudioBookCard
                      key={a.id}
                      audiobook={a}
                      isPurchased={audiobookPurchases.has(a.id)}
                      onBuy={handleAudioBuy}
                      onDownload={handleAudioDownload}
                      onOpen={setDetailAudiobook}
                      onPlayStart={handleAudioPlayStart}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {tab === "dashboard" && <SellerDashboard userId={user.id} onRefresh={fetchAll} />}
      {tab === "aboutus"   && <AboutUs onBack={() => setTab("resources")} />}

      {showUpload && <UploadModal userId={user.id} onClose={() => setShowUpload(false)} onSuccess={fetchAll} />}
      {showAudioUpload && <AudioBookUploadModal userId={user.id} onClose={() => setShowAudioUpload(false)} onSuccess={fetchAll} />}

      {detailRes  && (
        <ResourceDetailModal
          resource={detailRes}
          isPurchased={purchases.has(detailRes.id)}
          isBookmarked={bookmarks.has(detailRes.id)}
          onClose={() => setDetailRes(null)}
          onBuy={handleBuy}
          onDownload={handleDownload}
          onBookmarkToggle={handleBookmark}
          onRatingSubmit={async (resourceId: string) => {
            const { data: fresh } = await supabase
              .from("otechy_resources")
              .select("download_count,avg_rating,review_count")
              .eq("id", resourceId)
              .single();
            if (fresh) {
              setResources(prev => prev.map(r => r.id === resourceId ? { ...r, ...fresh } : r));
              setDetailRes((d: any) => d ? { ...d, ...fresh } : d);
            }
          }}
        />
      )}

      {detailAudiobook && (
        <AudioBookDetailModal
          audiobook={detailAudiobook}
          userId={user.id}
          isPurchased={audiobookPurchases.has(detailAudiobook.id)}
          isBookmarked={audiobookBookmarks.has(detailAudiobook.id)}
          onClose={() => setDetailAudiobook(null)}
          onBuy={handleAudioBuy}
          onDownload={handleAudioDownload}
          onBookmarkToggle={handleAudioBookmark}
          onPlayStart={handleAudioPlayStart}
          onRatingSubmit={async (audiobookId: string) => {
            const { data: fresh } = await bookshopSupabase
              .from(TABLE_AUDIOBOOKS)
              .select("download_count,avg_rating,review_count")
              .eq("id", audiobookId)
              .single();
            if (fresh) {
              setAudiobooks(prev => prev.map(a => a.id === audiobookId ? { ...a, ...fresh } : a));
              setDetailAudiobook(d => d ? { ...d, ...fresh } : d);
            }
          }}
        />
      )}
    </div>
  );
}