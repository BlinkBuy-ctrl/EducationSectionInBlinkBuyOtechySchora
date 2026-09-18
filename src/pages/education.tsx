import { useState, useEffect, useContext, useRef, useMemo } from "react";
import type { RefObject, MutableRefObject } from "react";
import { GraduationCap, BookOpen, Upload, Award, FileText, Bookmark, Users, Megaphone, Headphones, Sparkles, Briefcase, ChevronUp, ChevronDown } from "lucide-react";
import { bookshopSupabase } from "@/lib/bookshopSupabase";
import { tutorsSupabase } from "@/lib/tutorsSupabase";
import { scholarshipsSupabase } from "@/lib/scholarshipsSupabase";
import { EDUCATION_LEVELS, SUBJECTS_BY_LEVEL, resourcesClientForLevel, type EducationLevel } from "@/lib/resourceLevels";
import { AuthContext } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { SEARCH_PHRASES, type TranslationKey } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { AnimatedSearchInput } from "@/components/education/AnimatedSearchInput";
import { AiModeChat } from "@/components/education/AiModeChat";
import { ResourceCard } from "@/components/education/ResourceCard";
import { ResourceDetailModal } from "@/components/education/ResourceDetailModal";
import { UploadModal } from "@/components/education/UploadModal";
import { AudioBookCard } from "@/components/education/AudioBookCard";
import { AudioBookDetailModal } from "@/components/education/AudioBookDetailModal";
import { AudioBookUploadModal } from "@/components/education/AudioBookUploadModal";
import { SellerDashboard } from "@/components/education/SellerDashboard";
import { ScholarshipsTab } from "@/components/education/ScholarshipsTab";
import { ScholarshipCarousel } from "@/components/education/ScholarshipCarousel";
import { ScholarshipDetailModal } from "@/components/education/ScholarshipDetailModal";
import { TutorsTab } from "@/components/education/TutorsTab";
import { AdvertsTab } from "@/components/education/AdvertsTab";
import { UniversitiesTab } from "@/components/education/UniversitiesTab";
import { BookshopsTab } from "@/components/education/BookshopsTab";
import { JobsTab } from "@/components/education/JobsTab";
import { FetchingState } from "@/components/education/FetchingState";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import AboutUs from "@/components/education/AboutUs";
import { safeGetItem, safeSetItem } from "@/lib/storage";
import { getCache, setCache } from "@/lib/offlineCache";
import { jobsSupabase, type Job } from "@/lib/jobsSupabase";
import {
  AudioBook, AUDIOBOOK_CATEGORIES, TABLE_AUDIOBOOKS,
  TABLE_AUDIOBOOK_PURCHASES, TABLE_AUDIOBOOK_BOOKMARKS,
  getSignedAudioUrl,
} from "@/lib/audiobooks";

const CATS = ["All", "Past Papers", "Textbooks", "Notes", "Research", "Other"] as const;
const ACATS = ["All", ...AUDIOBOOK_CATEGORIES] as const;
// Display labels for CATS — the values above stay in English since they're
// the actual category strings stored in the database and used for filtering.
const CAT_LABEL_KEYS: Record<typeof CATS[number], TranslationKey | null> = {
  All: "filter_all", "Past Papers": "cat_past_papers", Textbooks: "cat_textbooks",
  Notes: "cat_notes", Research: "cat_research", Other: "cat_other",
};
type PriceFilter = "all" | "free" | "paid";
type ContentType = "documents" | "audio";
type Tab = "resources" | "scholarships" | "tutors" | "universities" | "bookshops" | "jobs" | "adverts" | "bookmarks" | "dashboard" | "aboutus";
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

export default function EducationPage() {
  const { user, ensureProfile } = useContext(AuthContext);
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const [resources,    setResources]    = useState<any[]>([]);
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [tutors,       setTutors]       = useState<any[]>([]);
  const [jobs,         setJobs]         = useState<Job[]>([]);
  const [purchases,    setPurchases]    = useState<Set<string>>(new Set());
  const [bookmarks,    setBookmarks]    = useState<Set<string>>(new Set());
  // Starts true (not false) so the very first paint shows the fetching
  // animation instead of a flash of "No resources found" before fetchAll()
  // has had a chance to run and flip this to true itself.
  const [loading,      setLoading]      = useState(true);
  const [showUpload,   setShowUpload]   = useState(false);
  const [detailRes,    setDetailRes]    = useState<any>(null);
  const [search,       setSearch]       = useState("");
  const [cat,          setCat]          = useState<typeof CATS[number]>("All");
  const [price,        setPrice]        = useState<PriceFilter>("all");
  const [level,        setLevel]        = useState<EducationLevel>("MSCE");
  const [subject,      setSubject]      = useState<string>("All");
  const [filtersOpen,  setFiltersOpen]  = useState(false);
  const [tab,          setTab]          = useState<Tab>("resources");
  const [aiModeOpen,   setAiModeOpen]   = useState(false);
  const [showOnboard,  setShowOnboard]  = useState(false);
  const [activeShortcutIndex, setActiveShortcutIndex] = useState(0);

  const [audiobooks,         setAudiobooks]         = useState<AudioBook[]>([]);
  const [audiobookPurchases, setAudiobookPurchases] = useState<Set<string>>(new Set());
  const [audiobookBookmarks, setAudiobookBookmarks] = useState<Set<string>>(new Set());
  const [contentType,        setContentType]        = useState<ContentType>("documents");
  const [audiobookCat,       setAudiobookCat]       = useState<typeof ACATS[number]>("All");
  const [showAudioUpload,    setShowAudioUpload]    = useState(false);
  const [detailAudiobook,    setDetailAudiobook]    = useState<AudioBook | null>(null);
  const [detailScholarship,  setDetailScholarship]  = useState<any>(null);

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
      toast({ title: next ? t("toast_tab_hint_on") : t("toast_tab_hint_off") });
      return next;
    });
  });

  const handleCatsBarTap = () => handleTripleTap(catsTapState, () => {
    setCatHintEnabled(prev => {
      const next = !prev;
      safeSetItem(CAT_HINT_ANIM_KEY, next ? "1" : "0");
      toast({ title: next ? t("toast_cat_hint_on") : t("toast_cat_hint_off") });
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
      cachedScholarships, cachedTutors,
      cachedAudiobooks, cachedAudiobookPurchases, cachedAudiobookBookmarks,
      cachedJobs,
    ] = await Promise.all([
      getCache<any>("scholarships"),
      getCache<any>("tutors"),
      getCache<AudioBook>("audiobooks"),
      getCache<{ id: string; audiobook_id: string }>("audiobook_purchases"),
      getCache<{ id: string; audiobook_id: string }>("audiobook_bookmarks"),
      getCache<Job>("jobs"),
    ]);

    if (cachedScholarships.length) setScholarships(cachedScholarships);
    if (cachedTutors.length)       setTutors(cachedTutors);
    if (cachedAudiobooks.length)   setAudiobooks(cachedAudiobooks);
    if (cachedJobs.length)         setJobs(cachedJobs);
    if (cachedAudiobookPurchases.length) setAudiobookPurchases(new Set(cachedAudiobookPurchases.map(p => p.audiobook_id)));
    if (cachedAudiobookBookmarks.length) setAudiobookBookmarks(new Set(cachedAudiobookBookmarks.map(b => b.audiobook_id)));
  };

  // Resources now live in a separate Supabase project per education level.
  // This fetches (and caches) resources + purchases + bookmarks for
  // whichever level is currently selected — it re-runs every time the
  // person switches Level on Browse.
  const fetchResources = async (lvl: EducationLevel) => {
    const noTable = (e: any) => e?.code === "42P01";
    const client = resourcesClientForLevel(lvl);

    // Cache-first flash on the very first load only.
    if (resources.length === 0) {
      const [cachedResources, cachedPurchases, cachedBookmarks] = await Promise.all([
        getCache<any>("resources"),
        getCache<{ id: string; resource_id: string }>("purchases"),
        getCache<{ id: string; resource_id: string }>("bookmarks"),
      ]);
      if (cachedResources.length) setResources(cachedResources);
      if (cachedPurchases.length) setPurchases(new Set(cachedPurchases.map(p => p.resource_id)));
      if (cachedBookmarks.length) setBookmarks(new Set(cachedBookmarks.map(b => b.resource_id)));
    }

    const [rRes, pRes, bRes] = await Promise.allSettled([
      client.from("otechy_resources")
        .select("id,title,description,category,subject,price,file_url,file_name,file_size,download_count,avg_rating,review_count,uploader_id,thumbnail_url,created_at")
        .order("created_at", { ascending: false }),
      client.from("otechy_purchases").select("resource_id").eq("buyer_id", user.id),
      client.from("otechy_bookmarks").select("resource_id").eq("user_id", user.id),
    ]);

    if (rRes.status === "fulfilled" && (!rRes.value.error || noTable(rRes.value.error))) {
      const rows = rRes.value.data ?? [];
      setResources(rows);
      setCache("resources", rows);
    } else if (navigator.onLine) {
      toast({
        title: t("toast_some_content_failed"),
        description: t("toast_couldnt_load", { items: "resources" }),
        variant: "destructive",
      });
    }

    if (pRes.status === "fulfilled" && !pRes.value.error) {
      const rows = pRes.value.data ?? [];
      setPurchases(new Set(rows.map((p: any) => p.resource_id)));
      setCache("purchases", rows.map((p: any) => ({ id: p.resource_id, resource_id: p.resource_id })));
    } else {
      setPurchases(new Set());
    }
    if (bRes.status === "fulfilled" && !bRes.value.error) {
      const rows = bRes.value.data ?? [];
      setBookmarks(new Set(rows.map((b: any) => b.resource_id)));
      setCache("bookmarks", rows.map((b: any) => ({ id: b.resource_id, resource_id: b.resource_id })));
    } else {
      setBookmarks(new Set());
    }
  };

  useEffect(() => { fetchResources(level); }, [level, user.id]);

  const handleLevelChange = (l: EducationLevel) => {
    setLevel(l);
    setSubject("All"); // subject list changes with level, so reset the old pick
  };

  // Whichever level's backend is currently active — used everywhere a
  // resource is read from or written to (download, buy, bookmark, rate).
  const activeResourcesClient = resourcesClientForLevel(level);

  const fetchAll = async () => {
    // Show cached content immediately if this is the very first load and we
    // have nothing on screen yet — avoids a blank/loading flash on reopen.
    if (resources.length === 0 && audiobooks.length === 0) {
      await loadFromCacheFirst();
    }

    setLoading(true);
    const noTable = (e: any) => e?.code === "42P01";
    const errors: string[] = [];

    const [sRes, tRes, abRes, apRes, abmRes] = await Promise.allSettled([
      scholarshipsSupabase.from("otechy_scholarships").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      tutorsSupabase.from("otechy_tutors").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      bookshopSupabase.from(TABLE_AUDIOBOOKS)
        .select("id,uploader_id,title,description,author,narrator,category,price,audio_url,audio_format,file_size,duration_seconds,cover_url,play_count,download_count,avg_rating,review_count,created_at")
        .order("created_at", { ascending: false }),
      bookshopSupabase.from(TABLE_AUDIOBOOK_PURCHASES).select("audiobook_id").eq("buyer_id", user.id),
      bookshopSupabase.from(TABLE_AUDIOBOOK_BOOKMARKS).select("audiobook_id").eq("user_id", user.id),
    ]);

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
        title: t("toast_some_content_failed"),
        description: t("toast_couldnt_load", { items: errors.join(", ") }),
        variant: "destructive",
      });
    }

    // Jobs — isolated Supabase project, fetched independently so a hiccup
    // here never blocks the rest of the page from loading.
    try {
      const { data, error } = await jobsSupabase.from("jobs").select("*").order("created_at", { ascending: false });
      if (!error) {
        setJobs(data ?? []);
        setCache("jobs", data ?? []);
      }
    } catch { /* offline or project unreachable — cached jobs (if any) stay on screen */ }

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

  // Header refresh button (Layout.tsx) — re-fetch this page's data only,
  // no window.location.reload(), so the splash screen never re-shows.
  useEffect(() => {
    const handler = () => { fetchAll(); };
    window.addEventListener("otechy:refresh-content", handler);
    return () => window.removeEventListener("otechy:refresh-content", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const filtered = resources.filter(r => {
    const q = search.toLowerCase();
    const mS = !q || r.title?.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q);
    const mC = cat === "All" || r.category === cat;
    const mSub = subject === "All" || r.subject === subject;
    return mS && mC && mSub;
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
      const { data, error } = await activeResourcesClient.storage.from("otechy-docs").createSignedUrl(resource.file_url, 60, { download: resource.file_name ?? true });
      if (error) throw error;
      // Point the browser straight at the signed URL so it streams and shows
      // native download progress immediately — no more waiting for the
      // whole file to load into memory first before anything visibly starts.
      const a = Object.assign(document.createElement("a"), { href: data.signedUrl, download: resource.file_name ?? "file" });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      try {
        await activeResourcesClient.rpc("increment_download", { resource_id: resource.id, caller_id: user.id });
        const { data: fresh } = await activeResourcesClient
          .from("otechy_resources")
          .select("download_count,avg_rating,review_count")
          .eq("id", resource.id)
          .single();
        if (fresh) {
          setResources(prev => prev.map(r => r.id === resource.id ? { ...r, ...fresh } : r));
          if (detailRes?.id === resource.id) setDetailRes((d: any) => ({ ...d, ...fresh }));
        }
      } catch { /* non-critical — download already succeeded */ }
      toast({ title: t("toast_download_started") });
    } catch (e: any) { toast({ title: t("toast_download_failed"), description: e.message, variant: "destructive" }); }
  };

  const handleBuy = async (resource: any) => {
    await ensureProfile();
    if (!window.confirm(t("confirm_purchase", { title: resource.title, price: Number(resource.price).toLocaleString() }))) return;
    try {
      const { error } = await activeResourcesClient.from("otechy_purchases").insert({ buyer_id: user.id, resource_id: resource.id, amount_paid: resource.price });
      if (error && error.code !== "23505") throw error;
      setPurchases(p => new Set([...p, resource.id]));
      toast({ title: t("toast_purchase_successful") });
    } catch (e: any) { toast({ title: t("toast_purchase_failed"), description: e.message, variant: "destructive" }); }
  };

  const handleBookmark = async (resource: any) => {
    await ensureProfile();
    const has = bookmarks.has(resource.id);
    try {
      if (has) {
        await activeResourcesClient.from("otechy_bookmarks").delete().eq("user_id", user.id).eq("resource_id", resource.id);
        setBookmarks(p => { const n = new Set(p); n.delete(resource.id); return n; });
        toast({ title: t("toast_bookmark_removed") });
      } else {
        await activeResourcesClient.from("otechy_bookmarks").insert({ user_id: user.id, resource_id: resource.id });
        setBookmarks(p => new Set([...p, resource.id]));
        toast({ title: t("toast_bookmarked") });
      }
    } catch (e: any) { toast({ title: t("toast_failed"), description: e.message, variant: "destructive" }); }
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
      toast({ title: t("toast_download_started") });
    } catch (e: any) { toast({ title: t("toast_download_failed"), description: e.message, variant: "destructive" }); }
  };

  const handleAudioBuy = async (audiobook: AudioBook) => {
    await ensureProfile();
    if (!window.confirm(t("confirm_purchase", { title: audiobook.title, price: Number(audiobook.price).toLocaleString() }))) return;
    try {
      const { error } = await bookshopSupabase.from(TABLE_AUDIOBOOK_PURCHASES).insert({
        buyer_id: user.id, audiobook_id: audiobook.id, amount_paid: audiobook.price,
      });
      if (error && error.code !== "23505") throw error;
      setAudiobookPurchases(p => new Set([...p, audiobook.id]));
      toast({ title: t("toast_purchase_successful") });
    } catch (e: any) { toast({ title: t("toast_purchase_failed"), description: e.message, variant: "destructive" }); }
  };

  const handleAudioBookmark = async (audiobook: AudioBook) => {
    await ensureProfile();
    const has = audiobookBookmarks.has(audiobook.id);
    try {
      if (has) {
        await bookshopSupabase.from(TABLE_AUDIOBOOK_BOOKMARKS).delete().eq("user_id", user.id).eq("audiobook_id", audiobook.id);
        setAudiobookBookmarks(p => { const n = new Set(p); n.delete(audiobook.id); return n; });
        toast({ title: t("toast_bookmark_removed") });
      } else {
        await bookshopSupabase.from(TABLE_AUDIOBOOK_BOOKMARKS).insert({ user_id: user.id, audiobook_id: audiobook.id });
        setAudiobookBookmarks(p => new Set([...p, audiobook.id]));
        toast({ title: t("toast_bookmarked") });
      }
    } catch (e: any) { toast({ title: t("toast_failed"), description: e.message, variant: "destructive" }); }
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

  const rotatingShortcuts = [
    { icon: GraduationCap, label: t("shortcut_higher_education"), onClick: () => setTab("universities") },
    { icon: BookOpen,      label: t("menu_bookstore"),            onClick: () => setTab("bookshops") },
    { icon: Users,         label: t("menu_tutors"),                onClick: () => setTab("tutors") },
    { icon: Headphones,    label: t("menu_audio_books"),           onClick: () => { setTab("resources"); setContentType("audio"); } },
    { icon: Award,         label: t("menu_scholarships"),          onClick: () => setTab("scholarships") },
  ];

  useEffect(() => {
    const id = setInterval(() => {
      setActiveShortcutIndex(i => (i + 1) % rotatingShortcuts.length);
    }, 50000);
    return () => clearInterval(id);
  }, []);

  const TABS: { key: Tab; emoji: string; label: string; count: number | null }[] = [
    { key: "resources",    emoji: "📚", label: t("menu_browse"),       count: resources.length + audiobooks.length },
    { key: "scholarships", emoji: "🏆", label: t("menu_scholarships"), count: scholarships.length },
    { key: "tutors",       emoji: "👨‍🏫", label: t("menu_tutors"),       count: tutors.length       },
    { key: "jobs",         emoji: "💼", label: t("menu_jobs"),          count: jobs.length         },
    { key: "universities", emoji: "🎓", label: t("shortcut_higher_education"), count: null            },
    { key: "bookshops",    emoji: "📖", label: t("menu_bookstore"),     count: null            },
    { key: "adverts",      emoji: "📢", label: t("menu_adverts"),      count: null                },
    { key: "bookmarks",    emoji: "🔖", label: t("menu_saved"),        count: saved.length + savedAudiobooks.length },
    { key: "dashboard",    emoji: "📊", label: t("menu_my_stats"),     count: null                },
    { key: "aboutus",      emoji: "ℹ️",  label: t("menu_about_us"),     count: null                },
  ];

  return (
    <div className="px-4 py-5 pb-6 w-full max-w-lg mx-auto">

      {showOnboard && (
        <OnboardingTutorial
          onDone={() => { safeSetItem(ONBOARDING_KEY, "1"); setShowOnboard(false); }}
          onUpload={() => { safeSetItem(ONBOARDING_KEY, "1"); setShowOnboard(false); handleUploadClick(); }}
        />
      )}

      <p className="text-sm font-black text-foreground mb-3">{t("did_you_know")}</p>

      <style>{`
        @keyframes shortcutFadeIn {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {(() => {
        const item = rotatingShortcuts[activeShortcutIndex];
        const Icon = item.icon;
        return (
          <button
            key={activeShortcutIndex}
            onClick={item.onClick}
            style={{ animation: "shortcutFadeIn 0.5s ease-out" }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 mb-5 active:scale-[0.98] transition-transform border border-border bg-card shadow-sm"
          >
            <Icon className="w-5 h-5 text-sky-500 shrink-0" />
            <span className="text-sm font-black text-foreground">{item.label}</span>
          </button>
        );
      })()}

      <div
        data-tour="tabs"
        ref={tabsScrollRef}
        onClick={handleTabBarTap}
        onTouchEnd={handleTabBarTap}
        className="flex gap-1 bg-muted/50 p-1 rounded-xl mb-4 overflow-x-auto scrollbar-hide scroll-smooth"
      >
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`shrink-0 flex items-center gap-1 text-[11px] font-semibold py-2 px-2.5 rounded-lg transition-all ${tab === t.key ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-sm" : "text-muted-foreground"}`}>
            {t.emoji} {t.label}
            {t.count !== null && <span className={`text-[9px] px-1 py-0.5 rounded-full font-bold ${tab === t.key ? "bg-white/20" : "bg-muted"}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === "resources" && (
        <>
          <div className="mb-3 flex items-center gap-2">
            <AnimatedSearchInput
              value={search}
              onChange={setSearch}
              phrases={contentType === "audio" ? SEARCH_PHRASES[language].audio : SEARCH_PHRASES[language].resources}
              ringColorClass={contentType === "audio" ? "focus:ring-pink-500/50" : "focus:ring-sky-500/50"}
              ariaLabel={contentType === "audio" ? t("aria_search_audiobooks") : t("aria_search_resources")}
              suggestionPool={searchSuggestions}
              className="flex-1"
            />
            <button
              onClick={() => setAiModeOpen(true)}
              aria-label={t("aria_open_ai_mode")}
              className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white flex items-center justify-center active:scale-95 transition-transform"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>

          {/* Content type switch — Documents vs Audio Books. Made a full-width,
              impossible-to-miss segmented control (previously a small pill
              buried at the end of the price filter row). */}
          <div className="grid grid-cols-2 gap-2 mb-3 p-1 bg-muted/50 rounded-xl">
            <button
              onClick={() => setContentType("documents")}
              className={`flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-lg transition-all ${
                contentType === "documents"
                  ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> {t("content_documents")}
            </button>
            <button
              onClick={() => setContentType("audio")}
              className={`flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-lg transition-all ${
                contentType === "audio"
                  ? "bg-gradient-to-r from-pink-600 to-sky-600 text-white shadow-sm shadow-pink-500/30"
                  : "text-muted-foreground"
              }`}
            >
              <Headphones className="w-3.5 h-3.5" /> {t("menu_audio_books")}
            </button>
          </div>

          {/* Level picker — MSCE / JCE / Primary. Documents-only: each level
              is its own backend, so this decides which project gets queried.
              Always visible (not part of the collapsible filters) since it's
              the primary choice, not a refinement. */}
          {contentType === "documents" && (
            <div className="mb-2">
              <div className="grid grid-cols-3 gap-2">
                {EDUCATION_LEVELS.map(l => (
                  <button key={l} onClick={() => handleLevelChange(l)}
                    className={`text-xs font-bold py-2.5 rounded-xl border transition-all ${
                      level === l ? "bg-gradient-to-r from-sky-600 to-blue-600 border-transparent text-white shadow-sm" : "border-border text-muted-foreground"
                    }`}>
                    {l === "MSCE" ? t("level_msce") : l === "JCE" ? t("level_jce") : t("level_primary")}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 px-0.5">{t("pick_level_reminder")}</p>
            </div>
          )}

          {/* Filters show/hide toggle — keeps Browse from feeling crowded;
              tap to reveal Subject + Category (documents) or Price +
              Category (audio), tap again to tuck them away. */}
          <button
            onClick={() => setFiltersOpen(o => !o)}
            aria-label={t("aria_toggle_filters")}
            className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold text-sky-500 active:scale-95 transition-transform"
          >
            {filtersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {filtersOpen ? t("filters_hide") : t("filters_show")}
          </button>

          {filtersOpen && (
            <>
              {contentType === "documents" ? (
                <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
                  <button onClick={() => setSubject("All")} className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${subject === "All" ? "bg-sky-600 border-sky-600 text-white" : "border-border text-muted-foreground"}`}>
                    {t("filter_all_subjects")}
                  </button>
                  {SUBJECTS_BY_LEVEL[level].map(s => (
                    <button key={s} onClick={() => setSubject(s)} className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${subject === s ? "bg-sky-600 border-sky-600 text-white" : "border-border text-muted-foreground"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
                  {(["all","free","paid"] as PriceFilter[]).map(f => (
                    <button key={f} onClick={() => setPrice(f)} className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${price === f ? "bg-sky-600 border-sky-600 text-white" : "border-border text-muted-foreground"}`}>
                      {f === "all" ? t("filter_all") : f === "free" ? t("filter_free") : t("filter_paid")}
                    </button>
                  ))}
                </div>
              )}

              <div
                ref={catsScrollRef}
                onClick={handleCatsBarTap}
                onTouchEnd={handleCatsBarTap}
                className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide scroll-smooth"
              >
                {contentType === "audio"
                  ? ACATS.map(c => (
                      <button key={c} onClick={() => setAudiobookCat(c)} className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${audiobookCat === c ? "bg-pink-600 border-pink-600 text-white" : "border-border text-muted-foreground"}`}>
                        {c === "All" ? t("filter_all") : c}
                      </button>
                    ))
                  : CATS.map(c => (
                      <button key={c} onClick={() => setCat(c)} className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${cat === c ? "bg-blue-600 border-blue-600 text-white" : "border-border text-muted-foreground"}`}>
                        {CAT_LABEL_KEYS[c] ? t(CAT_LABEL_KEYS[c]!) : c}
                      </button>
                    ))}
              </div>
            </>
          )}

          {contentType === "audio" ? (
            loading && filteredAudiobooks.length === 0 ? (
              <FetchingState
                icon={Headphones}
                label={t("fetching_audio_books")}
                accentBg="bg-pink-500/10"
                accentText="text-pink-400"
                ringColor="border-t-pink-500"
              />
            ) : filteredAudiobooks.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center"><Headphones className="w-7 h-7 text-pink-400" /></div>
                <p className="font-semibold text-foreground">{t("no_audio_books_found")}</p>
                <p className="text-sm text-muted-foreground">{t("be_first_to_upload")}</p>
                <button onClick={handleUploadClick} className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-sky-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-all">
                  <Upload className="w-4 h-4" /> {t("upload_audio_book")}
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
            loading && filtered.length === 0 ? (
              <FetchingState
                icon={BookOpen}
                label={t("fetching_resources")}
                accentBg="bg-sky-500/10"
                accentText="text-sky-400"
                ringColor="border-t-sky-500"
              />
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <div className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center"><BookOpen className="w-7 h-7 text-sky-400" /></div>
                <p className="font-semibold text-foreground">{t("no_resources_found")}</p>
                <p className="text-sm text-muted-foreground">{t("be_first_to_upload")}</p>
                <button onClick={handleUploadClick} className="flex items-center gap-2 bg-gradient-to-r from-sky-600 to-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-all">
                  <Upload className="w-4 h-4" /> {t("upload_resource")}
                </button>
              </div>
            ) : (
              <>
                <div data-tour="resource-grid" className="grid grid-cols-2 gap-3">
                  {filtered.slice(0, Math.ceil(filtered.length / 2)).map(r => <ResourceCard key={r.id} resource={r} isPurchased={purchases.has(r.id)} onBuy={handleBuy} onDownload={handleDownload} onOpen={setDetailRes} client={activeResourcesClient} />)}
                </div>

                {/* Embedded horizontal scholarships carousel — Facebook "People You May
                    Know" style — sits mid-feed without breaking the vertical PDF grid. */}
                <ScholarshipCarousel
                  scholarships={scholarships}
                  onOpen={setDetailScholarship}
                  onSeeAll={() => setTab("scholarships")}
                />

                <div className="grid grid-cols-2 gap-3">
                  {filtered.slice(Math.ceil(filtered.length / 2), Math.ceil(filtered.length / 2) + 8).map(r => <ResourceCard key={r.id} resource={r} isPurchased={purchases.has(r.id)} onBuy={handleBuy} onDownload={handleDownload} onOpen={setDetailRes} client={activeResourcesClient} />)}
                </div>

                {/* Second carousel — identical component/style — reappears after
                    roughly 4 more rows (8 cards) of books, same as Facebook
                    repeating "People You May Know" further down the feed. */}
                {filtered.length > Math.ceil(filtered.length / 2) + 8 && (
                  <ScholarshipCarousel
                    scholarships={[...scholarships].reverse()}
                    onOpen={setDetailScholarship}
                    onSeeAll={() => setTab("scholarships")}
                  />
                )}

                <div className="grid grid-cols-2 gap-3">
                  {filtered.slice(Math.ceil(filtered.length / 2) + 8).map(r => <ResourceCard key={r.id} resource={r} isPurchased={purchases.has(r.id)} onBuy={handleBuy} onDownload={handleDownload} onOpen={setDetailRes} client={activeResourcesClient} />)}
                </div>
              </>
            )
          )}
        </>
      )}

      {tab === "scholarships" && <ScholarshipsTab scholarships={scholarships} loading={loading} user={user} onRefresh={fetchAll} />}
      {tab === "tutors"       && <TutorsTab tutors={tutors} loading={loading} user={user} onRefresh={fetchAll} />}
      {tab === "jobs"         && <JobsTab jobs={jobs} loading={loading} user={user} onRefresh={fetchAll} isOnline={navigator.onLine} />}
      {tab === "universities" && <UniversitiesTab />}
      {tab === "bookshops"    && <BookshopsTab />}
      {tab === "adverts"      && <AdvertsTab userId={user.id} />}

      {tab === "bookmarks" && (
        saved.length === 0 && savedAudiobooks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center"><Bookmark className="w-7 h-7 text-sky-400" /></div>
            <p className="font-semibold">{t("no_saved_items")}</p>
            <p className="text-sm text-muted-foreground">{t("tap_bookmark_hint")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {saved.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">{t("section_resources")}</h2>
                <div className="grid grid-cols-2 gap-3">
                  {saved.map(r => <ResourceCard key={r.id} resource={r} isPurchased={purchases.has(r.id)} onBuy={handleBuy} onDownload={handleDownload} onOpen={setDetailRes} client={activeResourcesClient} />)}
                </div>
              </div>
            )}
            {savedAudiobooks.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">{t("menu_audio_books")}</h2>
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

      {tab === "dashboard" && (
        <SellerDashboard
          userId={user.id}
          onRefresh={fetchAll}
          onUploadClick={async () => { await ensureProfile(); setShowUpload(true); }}
          onAudioUploadClick={async () => { await ensureProfile(); setShowAudioUpload(true); }}
          onGoToTutors={() => setTab("tutors")}
        />
      )}
      {tab === "aboutus"   && <AboutUs onBack={() => setTab("resources")} />}

      {showUpload && <UploadModal userId={user.id} onClose={() => setShowUpload(false)} onSuccess={() => fetchResources(level)} />}
      {showAudioUpload && <AudioBookUploadModal userId={user.id} onClose={() => setShowAudioUpload(false)} onSuccess={fetchAll} />}
      {aiModeOpen && <AiModeChat onClose={() => setAiModeOpen(false)} />}

      {detailRes  && (
        <ResourceDetailModal
          resource={detailRes}
          isPurchased={purchases.has(detailRes.id)}
          isBookmarked={bookmarks.has(detailRes.id)}
          onClose={() => setDetailRes(null)}
          onBuy={handleBuy}
          onDownload={handleDownload}
          onBookmarkToggle={handleBookmark}
          allResources={resources}
          onOpenSimilar={setDetailRes}
          client={activeResourcesClient}
          onRatingSubmit={async (resourceId: string) => {
            const { data: fresh } = await activeResourcesClient
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

      {detailScholarship && (
        <ScholarshipDetailModal
          s={detailScholarship}
          user={user}
          onClose={() => setDetailScholarship(null)}
        />
      )}
    </div>
  );
}