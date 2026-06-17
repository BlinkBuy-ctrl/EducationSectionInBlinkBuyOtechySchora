import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import {
  GraduationCap, Sun, Moon, Bell,
  Home, BarChart2, Search, Upload,
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  /** Optional: called when user taps the Post (upload) button in the bottom nav */
  onPostClick?: () => void;
}

export default function Layout({ children, onPostClick }: LayoutProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loc] = useLocation();
  const [unread, setUnread] = useState(0);

  // ── Notification badge ────────────────────────────────────────────────────
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
    const channel = supabase
      .channel("layout_notifs_" + user.id)
      .on("postgres_changes", {
        event: "INSERT", schema: "public",
        table: "otechy_notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => setUnread(prev => prev + 1))
      .on("postgres_changes", {
        event: "UPDATE", schema: "public",
        table: "otechy_notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user.id]);

  useEffect(() => {
    if (loc === "/notifications") setUnread(0);
  }, [loc]);

  // ── Bottom nav helpers ────────────────────────────────────────────────────
  // "My Stats" maps to ?tab=dashboard on the education page;
  // "Search"   maps to ?tab=resources&search=1  (just takes them to browse)
  // "Post"     fires onPostClick if provided, else dispatches a custom event
  // that education.tsx can listen to.
  const handlePost = () => {
    if (onPostClick) { onPostClick(); return; }
    window.dispatchEvent(new CustomEvent("otechy:open-upload"));
  };

  const isHome   = loc === "/";
  const isStats  = loc === "/" && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "dashboard";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-40 bg-sidebar border-b border-sidebar-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-md">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-sm text-white leading-tight hidden sm:block">
              OtechySchora
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link
              href="/notifications"
              className="relative w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 w-full pb-20 sm:pb-0">
        {children}
      </main>

      <footer className="hidden sm:block border-t border-border py-5 text-center text-xs text-muted-foreground">
        OtechySchora · Education Hub · Malawi
      </footer>

      {/* ── Bottom Mobile Navigation (mobile only, hidden on sm+) ── */}
      <nav data-tour="bottom-nav" className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border flex items-stretch h-16 safe-bottom">

        {/* Home */}
        <Link
          href="/"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors
            ${isHome && !isStats ? "text-purple-400" : "text-white/50 hover:text-white/80"}`}
        >
          <Home className="w-5 h-5" />
          Home
        </Link>

        {/* My Stats */}
        <Link
          href="/?tab=dashboard"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors
            ${isStats ? "text-purple-400" : "text-white/50 hover:text-white/80"}`}
        >
          <BarChart2 className="w-5 h-5" />
          My Stats
        </Link>

        {/* Post — center accent button */}
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={handlePost}
            className="w-12 h-12 -mt-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30 active:scale-95 transition-transform"
            aria-label="Upload / Post"
          >
            <Upload className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Search */}
        <Link
          href="/?tab=resources"
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-white/50 hover:text-white/80 transition-colors"
        >
          <Search className="w-5 h-5" />
          Search
        </Link>

        {/* Notifications (reuse bell) */}
        <Link
          href="/notifications"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold relative transition-colors
            ${loc === "/notifications" ? "text-purple-400" : "text-white/50 hover:text-white/80"}`}
        >
          <span className="relative">
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 leading-none">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </span>
          Alerts
        </Link>
      </nav>
    </div>
  );
}
