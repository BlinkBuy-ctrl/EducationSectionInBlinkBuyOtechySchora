import { useState, useEffect, useContext } from "react";
import { Bell, Check, CheckCheck, Trash2, Download, ShoppingBag, GraduationCap, Info, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthContext } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Notification = {
  id: string;
  type: "info" | "purchase" | "download" | "scholarship" | "welcome" | "upload";
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

const TYPE_ICON: Record<string, { icon: any; color: string; bg: string }> = {
  welcome:     { icon: GraduationCap, color: "text-purple-400", bg: "bg-purple-500/15" },
  purchase:    { icon: ShoppingBag,   color: "text-green-400",  bg: "bg-green-500/15"  },
  download:    { icon: Download,      color: "text-blue-400",   bg: "bg-blue-500/15"   },
  scholarship: { icon: GraduationCap, color: "text-yellow-400", bg: "bg-yellow-500/15" },
  upload:      { icon: GraduationCap, color: "text-pink-400",   bg: "bg-pink-500/15"   },
  info:        { icon: Info,          color: "text-gray-400",   bg: "bg-gray-500/15"   },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("otechy_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setNotifications(data ?? []);
    } catch (e: any) {
      toast({ title: "Failed to load notifications", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Mark single as read
  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await supabase.from("otechy_notifications").update({ read: true }).eq("id", id);
  };

  // Mark all as read
  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await supabase
      .from("otechy_notifications")
      .update({ read: true })
      .eq("user_id", user!.id)
      .eq("read", false);
    toast({ title: "All marked as read" });
  };

  // Delete single
  const deleteOne = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from("otechy_notifications").delete().eq("id", id);
  };

  // Delete all
  const deleteAll = async () => {
    if (!window.confirm("Delete all notifications?")) return;
    setNotifications([]);
    await supabase.from("otechy_notifications").delete().eq("user_id", user!.id);
    toast({ title: "All notifications cleared" });
  };

  // Realtime — new notifications push instantly
  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel("otechy_notifs_" + user.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "otechy_notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unread = notifications.filter(n => !n.read).length;

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-6">
      <Bell className="w-10 h-10 text-muted-foreground" />
      <p className="font-semibold text-foreground">Sign in to see notifications</p>
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-20">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-base text-foreground leading-tight">Notifications</h1>
            {unread > 0 && (
              <p className="text-[11px] text-purple-400 font-semibold">{unread} unread</p>
            )}
          </div>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-400 hover:text-blue-300 px-2.5 py-1.5 rounded-lg hover:bg-blue-500/10 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <button
              onClick={deleteAll}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400 hover:text-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-purple-500" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Bell className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No notifications yet</p>
          <p className="text-sm text-muted-foreground">You'll be notified about purchases, downloads, and more.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map(n => {
            const cfg = TYPE_ICON[n.type] ?? TYPE_ICON.info;
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={`relative flex items-start gap-3 p-4 rounded-2xl border transition-all duration-150 cursor-pointer group ${
                  n.read
                    ? "bg-card border-border opacity-70"
                    : "bg-card border-purple-500/30 shadow-sm shadow-purple-500/10"
                }`}
              >
                {/* Unread dot */}
                {!n.read && (
                  <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-purple-500" />
                )}

                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <Icon className={`w-4.5 h-4.5 ${cfg.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-4">
                  <p className={`text-sm font-semibold leading-snug ${n.read ? "text-muted-foreground" : "text-foreground"}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">{timeAgo(n.created_at)}</p>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteOne(n.id); }}
                  className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
