import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { GraduationCap, Sun, Moon, Bell, Home, BarChart2, Search, Upload } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loc, setLoc] = useLocation();
  const [unread, setUnread] = useState(0);

  const fetchUnread = async () => {
    const { count } = await supabase
      .from("otechy_notifications").select("*", { count: "exact", head: true })
      .eq("user_id", user.id).eq("read", false);
    setUnread(count ?? 0);
  };

  useEffect(() => {
    fetchUnread();
    const ch = supabase.channel("notif_" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "otechy_notifications", filter: `user_id=eq.${user.id}` }, () => setUnread(p => p + 1))
      .on("postgres_changes", { event: "UPDATE",  schema: "public", table: "otechy_notifications", filter: `user_id=eq.${user.id}` }, fetchUnread)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user.id]);

  // Determine active tab from URL search param
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const activeTab = params.get("tab") ?? "";
  const isHome    = loc === "/" && !activeTab;
  const isStats   = loc === "/" && activeTab === "dashboard";
  const isSearch  = loc === "/" && activeTab === "resources";
  const isAlerts  = loc === "/notifications";

  const goTo = (path: string) => { setLoc(path); };

  const handlePost = () => window.dispatchEvent(new CustomEvent("otechy:open-upload"));

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col overflow-x-hidden">

      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-sidebar border-b border-sidebar-border">
        <div className="px-4 h-14 flex items-center justify-between">
          <button onClick={() => goTo("/")} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-white text-sm">OtechySchora</span>
          </button>
          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => goTo("/notifications")} className="relative w-9 h-9 rounded-xl flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors">
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

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-[80px]" style={{ WebkitOverflowScrolling: "touch" }}>
        {children}
      </main>

      {/* Bottom nav */}
      <nav
        data-tour="bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border flex h-16"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <button
          onClick={() => goTo("/")}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${isHome ? "text-purple-400" : "text-white/50"}`}
        >
          <Home className="w-5 h-5" />
          Home
        </button>

        <button
          onClick={() => { goTo("/?tab=dashboard"); window.dispatchEvent(new CustomEvent("otechy:set-tab", { detail: "dashboard" })); }}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${isStats ? "text-purple-400" : "text-white/50"}`}
        >
          <BarChart2 className="w-5 h-5" />
          My Stats
        </button>

        {/* Centre post button */}
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={handlePost}
            className="w-12 h-12 -mt-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/40 active:scale-95 transition-transform"
          >
            <Upload className="w-5 h-5 text-white" />
          </button>
        </div>

        <button
          onClick={() => { goTo("/?tab=resources"); window.dispatchEvent(new CustomEvent("otechy:set-tab", { detail: "resources" })); }}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${isSearch ? "text-purple-400" : "text-white/50"}`}
        >
          <Search className="w-5 h-5" />
          Search
        </button>

        <button
          onClick={() => goTo("/notifications")}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold relative transition-colors ${isAlerts ? "text-purple-400" : "text-white/50"}`}
        >
          <span className="relative">
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </span>
          Alerts
        </button>
      </nav>
    </div>
  );
}
