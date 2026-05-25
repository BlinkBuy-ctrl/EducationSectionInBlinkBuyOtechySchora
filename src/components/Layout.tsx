import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { GraduationCap, Sun, Moon, LogOut, Bell, User } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loc] = useLocation();
  const [, setLocation] = useLocation();
  const [unread, setUnread] = useState(0);

  // Fetch unread count
  const fetchUnread = async () => {
    if (!user) return;
    const { count } = await supabase
      .from("otechy_notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setUnread(count ?? 0);
  };

  // Realtime — badge updates instantly when new notification arrives
  useEffect(() => {
    if (!user) return;
    fetchUnread();

    const channel = supabase
      .channel("layout_notifs_" + user.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "otechy_notifications", filter: `user_id=eq.${user.id}` },
        () => setUnread(prev => prev + 1)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "otechy_notifications", filter: `user_id=eq.${user.id}` },
        () => fetchUnread()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Reset badge when visiting notifications page
  useEffect(() => {
    if (loc === "/notifications") setUnread(0);
  }, [loc]);

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-40 bg-sidebar border-b border-sidebar-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-md">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-sm text-white leading-tight hidden sm:block">
              OtechySchora
            </span>
          </Link>

          {/* Right controls */}
          <div className="flex items-center gap-1.5">

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <>
                {/* Bell with unread badge */}
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

                {/* User name */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10">
                  <User className="w-3.5 h-3.5 text-purple-300" />
                  <span className="text-xs text-white/80 font-medium max-w-[80px] truncate">
                    {profile?.name || user.email?.split("@")[0]}
                  </span>
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/login"
                  className="text-xs font-semibold text-white/80 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-xs font-semibold bg-gradient-to-r from-purple-500 to-blue-600 text-white px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 w-full">
        {children}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        OtechySchora · Education Hub · Malawi
      </footer>
    </div>
  );
}
