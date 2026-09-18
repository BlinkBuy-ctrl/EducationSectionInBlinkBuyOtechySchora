import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/hooks/useLanguage";
import { LANGUAGES, type Language, type TranslationKey } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import {
  GraduationCap, Sun, Moon, Bell, RefreshCw,
  Home, BarChart2, Search, Upload, Megaphone,
  ChevronUp, ChevronDown, Headphones, Award, Users,
  Briefcase, Building2, BookText, Bookmark, BookOpen, Info,
  Rocket, Languages,
} from "lucide-react";
import OtechyAcademyModal from "@/components/education/OtechyAcademyModal";

/** Hand-drawn to match the exact dot + bar icon supplied for this menu —
 *  no icon set ships this glyph, so it's custom rather than approximated. */
function CategoryMenuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 16" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="1.4" cy="2" r="1.4" />
      <rect x="5.5" y="0.8" width="14.5" height="2.4" rx="1.2" />
      <circle cx="1.4" cy="8" r="1.4" />
      <rect x="5.5" y="6.8" width="14.5" height="2.4" rx="1.2" />
      <circle cx="1.4" cy="14" r="1.4" />
      <rect x="5.5" y="12.8" width="14.5" height="2.4" rx="1.2" />
    </svg>
  );
}

interface MenuItem {
  icon: React.ElementType;
  labelKey: TranslationKey;
  tab?: string;
  route?: string;
  action?: "academy" | "language";
  lang?: Language; // only set when action === "language"
}
interface MenuGroup { labelKey?: TranslationKey; items: MenuItem[] }

const MENU_GROUPS: MenuGroup[] = [
  { items: [
    { icon: Home, labelKey: "menu_home", tab: "" },
  ]},
  { labelKey: "menu_section_sections", items: [
    { icon: Search,     labelKey: "menu_browse",       tab: "resources" },
    { icon: Headphones, labelKey: "menu_audio_books",  tab: "resources" },
    { icon: Award,      labelKey: "menu_scholarships", tab: "scholarships" },
    { icon: Users,      labelKey: "menu_tutors",       tab: "tutors" },
    { icon: Briefcase,  labelKey: "menu_jobs",         tab: "jobs" },
    { icon: Building2,  labelKey: "menu_universities", tab: "universities" },
    { icon: BookText,   labelKey: "menu_bookstore",    tab: "bookshops" },
    { icon: Megaphone,  labelKey: "menu_adverts",      tab: "adverts" },
  ]},
  { labelKey: "menu_section_personal", items: [
    { icon: Bookmark,  labelKey: "menu_saved",    tab: "bookmarks" },
    { icon: BarChart2, labelKey: "menu_my_stats", tab: "dashboard" },
  ]},
  { labelKey: "menu_section_utility", items: [
    { icon: BookOpen, labelKey: "menu_book_request_center", route: "/book-request-center" },
    { icon: Info,     labelKey: "menu_about_us",            tab: "aboutus" },
  ]},
  { labelKey: "menu_section_earn", items: [
    { icon: Rocket, labelKey: "menu_income_skills", action: "academy" },
  ]},
  { labelKey: "menu_section_language", items: LANGUAGES.map(l => ({
    icon: Languages,
    labelKey: (l.code === "en" ? "lang_english" : "lang_chichewa") as TranslationKey,
    action: "language" as const,
    lang: l.code,
  })) },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [loc, navigate] = useLocation();
  const [unread, setUnread] = useState(0);
  // Track active tab via state so nav buttons never go stale
  const [activeTab, setActiveTab] = useState<string>("");

  /* ── Header category menu (replaces the old three-dot menu) ── */
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  // Which labeled groups are collapsed (minimized) inside the menu — every
  // group starts open; tapping a group's header toggles it shut/open.
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (key: string) => setCollapsedGroups(p => ({ ...p, [key]: !p[key] }));

  const openMenu = () => {
    const rect = menuBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setMenuOpen(true);
  };

  const goMenuItem = (item: MenuItem) => {
    if (item.action === "academy") { setMenuOpen(false); window.dispatchEvent(new CustomEvent("otechy:open-academy")); return; }
    if (item.action === "language" && item.lang) { setLanguage(item.lang); setMenuOpen(false); return; }
    setMenuOpen(false);
    if (item.route) { navigate(item.route); setActiveTab(""); return; }
    navigate("/");
    setActiveTab(item.tab ?? "");
    window.dispatchEvent(new CustomEvent("otechy:set-tab", { detail: item.tab ?? "" }));
  };

  /* ── Scroll-sense up/down buttons ── */
  const scrollRef = useRef<HTMLElement>(null);
  const [showUp, setShowUp] = useState(false);
  const [showDown, setShowDown] = useState(false);
  const [scrollBtnsVisible, setScrollBtnsVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const THRESHOLD = 24; // px slack near edges before hiding an arrow

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atTop = scrollTop <= THRESHOLD;
      const atBottom = scrollTop + clientHeight >= scrollHeight - THRESHOLD;
      const scrollable = scrollHeight - clientHeight > THRESHOLD * 2;

      setShowUp(scrollable && !atTop);
      setShowDown(scrollable && !atBottom);

      // Buttons appear while scrolling, then fade away shortly after it stops
      setScrollBtnsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setScrollBtnsVisible(false), 1500);
    };

    handleScroll();
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [loc, activeTab]);

  const scrollToTop = () => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToBottom = () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });

  /* ── Unread notifications ── */
  const fetchUnread = async () => {
    const { count } = await supabase
      .from("otechy_notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setUnread(count ?? 0);
  };

  useEffect(() => {
    fetchUnread();
    const ch = supabase
      .channel("notif_" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "otechy_notifications", filter: `user_id=eq.${user.id}` }, () => setUnread(p => p + 1))
      .on("postgres_changes", { event: "UPDATE",  schema: "public", table: "otechy_notifications", filter: `user_id=eq.${user.id}` }, fetchUnread)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user.id]);

  /* ── Sync activeTab from custom events ── */
  useEffect(() => {
    const handler = (e: Event) => setActiveTab((e as CustomEvent).detail ?? "");
    window.addEventListener("otechy:set-tab", handler);
    return () => window.removeEventListener("otechy:set-tab", handler);
  }, []);

  /* ── File download trigger — a single persistent hidden iframe handles
     every download for the whole app session. Never created/destroyed per
     click, so there's nothing to race against a modal closing at the same
     moment (that race was the actual cause of the earlier freeze). Also
     never opens a new tab — the iframe just quietly loads the file URL,
     the browser's Content-Disposition header (set via the signed URL's
     `download` option) turns that into a native file save, nothing visibly
     navigates. ── */
  const downloadFrameRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const url = (e as CustomEvent<{ url: string }>).detail?.url;
      if (url && downloadFrameRef.current) downloadFrameRef.current.src = url;
    };
    window.addEventListener("otechy:trigger-download", handler);
    return () => window.removeEventListener("otechy:trigger-download", handler);
  }, []);

  /* ── Reset tab on route change ── */
  useEffect(() => { setActiveTab(""); }, [loc]);

  /* ── Nav helpers ── */
  const goHome = () => { navigate("/"); setActiveTab(""); };
  const goStats = () => {
    navigate("/");
    setActiveTab("dashboard");
    window.dispatchEvent(new CustomEvent("otechy:set-tab", { detail: "dashboard" }));
  };
  const goSearch = () => {
    navigate("/");
    setActiveTab("resources");
    window.dispatchEvent(new CustomEvent("otechy:set-tab", { detail: "resources" }));
  };
  const goAdverts = () => {
    navigate("/");
    setActiveTab("adverts");
    window.dispatchEvent(new CustomEvent("otechy:set-tab", { detail: "adverts" }));
  };
  const goNotifications = () => { navigate("/notifications"); setActiveTab(""); };
  const goPost   = () => window.dispatchEvent(new CustomEvent("otechy:open-upload"));

  /* ── Soft refresh: re-fetch current page's data only, no app/splash restart ── */
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    fetchUnread();
    window.dispatchEvent(new CustomEvent("otechy:refresh-content"));
    setTimeout(() => setRefreshing(false), 650);
  };

  const isHome     = loc === "/" && activeTab === "";
  const isStats    = loc === "/" && activeTab === "dashboard";
  const isSearch   = loc === "/" && activeTab === "resources";
  const isAdverts  = loc === "/" && activeTab === "adverts";

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(var(--vh,1vh) * 100)", overflow:"hidden" }}
         className="bg-background text-foreground">

      {/* Hidden, permanent — powers every file download in the app.
          display:none intentionally, not visually hidden-but-present, since
          it never needs to be seen. */}
      <iframe ref={downloadFrameRef} title="downloads" style={{ display: "none" }} />

      {/* ── Top bar ── */}
      <header className="shrink-0 bg-sidebar border-b border-sidebar-border z-40">
        <div className="px-4 h-14 flex items-center justify-between">
          <button onClick={goHome} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-white text-sm">SchoraHub</span>
          </button>
          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center text-white/70 transition-colors">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={handleRefresh} aria-label={t("aria_refresh")} className="w-9 h-9 rounded-xl flex items-center justify-center text-white/70">
              <RefreshCw className={`w-4 h-4 transition-transform duration-500 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button onClick={goNotifications} className="relative w-9 h-9 rounded-xl flex items-center justify-center text-white/70 transition-colors">
              <Bell className="w-4 h-4" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
            <button
              ref={menuBtnRef}
              onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${menuOpen ? "bg-white/10 text-white" : "text-white/70"}`}
              aria-label={t("aria_browse_sections")}
              aria-expanded={menuOpen}
            >
              <CategoryMenuIcon className="w-[18px] h-[15px]" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Header category menu ── */}
      {menuOpen && createPortal(
        <>
          {/* Invisible backdrop — tap anywhere outside the menu to close it */}
          <div
            className="fixed inset-0 z-[59]"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="fixed z-[60] w-72 max-h-[75vh] overflow-y-auto rounded-2xl border border-sidebar-border bg-sidebar shadow-xl shadow-black/40 animate-in fade-in zoom-in-95 duration-150 origin-top-right"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            <div className="p-2.5">
              {MENU_GROUPS.map((group, gi) => {
                const isCollapsed = group.labelKey ? !!collapsedGroups[group.labelKey] : false;
                return (
                <div key={gi} className={gi > 0 ? "mt-3 pt-3 border-t border-white/[0.06]" : ""}>
                  {group.labelKey && (
                    <button
                      onClick={() => toggleGroup(group.labelKey!)}
                      className="w-full flex items-center justify-between px-1.5 pb-1.5 active:opacity-70"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                        {t(group.labelKey)}
                      </span>
                      {isCollapsed
                        ? <ChevronDown className="w-3.5 h-3.5 text-white/35" />
                        : <ChevronUp className="w-3.5 h-3.5 text-white/35" />}
                    </button>
                  )}
                  {!isCollapsed && (
                  <div className={group.labelKey ? "flex flex-col gap-1.5" : ""}>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = item.action === "language"
                        ? item.lang === language
                        : item.action ? false : item.route ? loc === item.route : (loc === "/" && activeTab === (item.tab ?? ""));
                      return (
                        <button
                          key={item.labelKey + (item.lang ?? "")}
                          onClick={() => goMenuItem(item)}
                          className={`flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-left transition-colors active:scale-[0.97] w-full ${
                            active ? "bg-sky-500/15" : "active:bg-white/5"
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${active ? "text-sky-400" : "text-sky-400/80"}`} />
                          <span className={`text-[12.5px] font-semibold truncate ${active ? "text-white" : "text-white/85"}`}>
                            {t(item.labelKey)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ── Scroll area ── */}
      <main
        ref={scrollRef}
        className="flex-1 overflow-x-hidden relative"
        style={{ overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
      >
        <div className="pb-24">{children}</div>

        {/* ── Scroll-sense arrows ── */}
        <div className="sticky bottom-4 w-full flex justify-end pr-3 pointer-events-none">
          <div className="flex flex-col items-end gap-2">
            {showUp && (
              <button
                onClick={scrollToTop}
                aria-label={t("aria_scroll_top")}
                className={`w-10 h-10 rounded-full bg-sidebar/60 backdrop-blur-sm border border-sidebar-border/60 shadow-md flex items-center justify-center text-white/90 active:scale-90 transition-all duration-300 ${scrollBtnsVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                style={{ transform: scrollBtnsVisible ? "translateY(0)" : "translateY(4px)" }}
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            )}
            {showDown && (
              <button
                onClick={scrollToBottom}
                aria-label={t("aria_scroll_bottom")}
                className={`w-10 h-10 rounded-full bg-sidebar/60 backdrop-blur-sm border border-sidebar-border/60 shadow-md flex items-center justify-center text-white/90 active:scale-90 transition-all duration-300 ${scrollBtnsVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                style={{ transform: scrollBtnsVisible ? "translateY(0)" : "translateY(-4px)" }}
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </main>

      {/* ── Bottom nav ── */}
      <nav
        data-tour="bottom-nav"
        className="shrink-0 bg-sidebar border-t border-sidebar-border z-50 flex"
        style={{ height: "calc(64px + env(safe-area-inset-bottom,0px))", paddingBottom: "env(safe-area-inset-bottom,0px)" }}
      >
        <button onClick={goHome}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${isHome ? "text-sky-400" : "text-white/50"}`}>
          <Home className="w-5 h-5" />{t("nav_home")}
        </button>

        <button onClick={goStats}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${isStats ? "text-sky-400" : "text-white/50"}`}>
          <BarChart2 className="w-5 h-5" />{t("nav_stats")}
        </button>

        <div className="flex-1 flex items-center justify-center">
          <button onClick={goPost}
            className="w-12 h-12 -mt-5 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/40 active:scale-95 transition-transform">
            <Upload className="w-5 h-5 text-white" />
          </button>
        </div>

        <button onClick={goSearch}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${isSearch ? "text-sky-400" : "text-white/50"}`}>
          <Search className="w-5 h-5" />{t("nav_search")}
        </button>

        <button onClick={goAdverts}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${isAdverts ? "text-sky-400" : "text-white/50"}`}>
          <Megaphone className="w-5 h-5" />{t("nav_adverts")}
        </button>
      </nav>

      <OtechyAcademyModal />
    </div>
  );
}
