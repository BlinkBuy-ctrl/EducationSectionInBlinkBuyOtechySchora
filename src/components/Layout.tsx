import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import {
  GraduationCap, Sun, Moon, Bell, RefreshCw,
  Home, BarChart2, Search, Upload, Megaphone,
  ChevronUp, ChevronDown,
} from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loc, navigate] = useLocation();
  const [unread, setUnread] = useState(0);
  // Track active tab via state so nav buttons never go stale
  const [activeTab, setActiveTab] = useState<string>("");

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

  const isHome     = loc === "/" && activeTab === "";
  const isStats    = loc === "/" && activeTab === "dashboard";
  const isSearch   = loc === "/" && activeTab === "resources";
  const isAdverts  = loc === "/" && activeTab === "adverts";

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(var(--vh,1vh) * 100)", overflow:"hidden" }}
         className="bg-background text-foreground">

      {/* ── Top bar ── */}
      <header className="shrink-0 bg-sidebar border-b border-sidebar-border z-40">
        <div className="px-4 h-14 flex items-center justify-between">
          <button onClick={goHome} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-white text-sm">SchoraHub</span>
          </button>
          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center text-white/70 transition-colors">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => window.location.reload()} className="w-9 h-9 rounded-xl flex items-center justify-center text-white/70 active:[&>svg]:rotate-180 [&>svg]:transition-transform [&>svg]:duration-500">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={goNotifications} className="relative w-9 h-9 rounded-xl flex items-center justify-center text-white/70 transition-colors">
              <Bell className="w-4 h-4" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

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
                aria-label="Scroll to top"
                className={`w-10 h-10 rounded-full bg-sidebar/60 backdrop-blur-sm border border-sidebar-border/60 shadow-md flex items-center justify-center text-white/90 active:scale-90 transition-all duration-300 ${scrollBtnsVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                style={{ transform: scrollBtnsVisible ? "translateY(0)" : "translateY(4px)" }}
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            )}
            {showDown && (
              <button
                onClick={scrollToBottom}
                aria-label="Scroll to bottom"
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
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${isHome ? "text-purple-400" : "text-white/50"}`}>
          <Home className="w-5 h-5" />Home
        </button>

        <button onClick={goStats}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${isStats ? "text-purple-400" : "text-white/50"}`}>
          <BarChart2 className="w-5 h-5" />My Stats
        </button>

        <div className="flex-1 flex items-center justify-center">
          <button onClick={goPost}
            className="w-12 h-12 -mt-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/40 active:scale-95 transition-transform">
            <Upload className="w-5 h-5 text-white" />
          </button>
        </div>

        <button onClick={goSearch}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${isSearch ? "text-purple-400" : "text-white/50"}`}>
          <Search className="w-5 h-5" />Search
        </button>

        <button onClick={goAdverts}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${isAdverts ? "text-purple-400" : "text-white/50"}`}>
          <Megaphone className="w-5 h-5" />Adverts
        </button>
      </nav>
    </div>
  );
}
