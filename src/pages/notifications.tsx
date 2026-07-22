import { useState, useEffect, useContext } from "react";
import { Bell, BellOff, Check, CheckCheck, Trash2, Download, ShoppingBag, GraduationCap, Info, Loader2, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { bookshopSupabase } from "@/lib/bookshopSupabase";
import { AuthContext } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Notification = {
  id: string;
  type: "info" | "purchase" | "download" | "scholarship" | "welcome" | "upload" | "tutor" | "comment";
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
  tutor:       { icon: Users,         color: "text-cyan-400",   bg: "bg-cyan-500/15"   },
  comment:     { icon: Info,          color: "text-orange-400", bg: "bg-orange-500/15" },
  info:        { icon: Info,          color: "text-gray-400",   bg: "bg-gray-500/15"   },
};

// Same VAPID public key used in send-notification.ts
const VAPID_PUBLIC_KEY = "BGIoLhtHS59h97l8zrnMNnVKRM6gGcArrow9INvV8QGRz8Un7VJxUdOBo3bBkowsfmj86Lh4w2LK_xEzb2-xvOc";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function subscribeToPush(userId: string | null): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const json = sub.toJSON() as any;
    const { error } = await bookshopSupabase.from("otechy_push_subscriptions").upsert(
      { user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
      { onConflict: "endpoint" }
    );
    if (error) {
      // This is the important part: the browser-side subscribe can succeed
      // while the DB save fails (e.g. RLS blocking the anon key) — without
      // this check that failure was invisible and the toggle would show
      // "ON" even though no row was ever saved.
      console.error("Push subscription DB save failed:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("Push subscription failed:", e);
    return false;
  }
}

async function unsubscribeFromPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await bookshopSupabase.from("otechy_push_subscriptions").delete().eq("endpoint", endpoint);
    }
    return true;
  } catch (e) {
    console.warn("Unsubscribe failed:", e);
    return false;
  }
}

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
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Check current push state on mount
  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushPermission("unsupported");
      return;
    }
    setPushPermission(Notification.permission);
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setPushSubscribed(!!sub))
    );
  }, []);

  // Auto-subscribe if already granted (re-subscribe on new installs)
  useEffect(() => {
    if (pushPermission === "granted" && !pushSubscribed) {
      subscribeToPush(user?.id ?? null).then((ok) => { if (ok) setPushSubscribed(true); });
    }
  }, [pushPermission, pushSubscribed, user?.id]);

  const handleEnablePush = async () => {
    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission === "granted") {
        const ok = await subscribeToPush(user?.id ?? null);
        setPushSubscribed(ok);
        if (ok) toast({ title: "✅ Notifications enabled", description: "You'll get updates even when the app is closed." });
        else toast({ title: "Failed to subscribe", variant: "destructive" });
      } else {
        toast({ title: "Permission denied", description: "Enable notifications in your browser settings.", variant: "destructive" });
      }
    } finally {
      setPushLoading(false);
    }
  };

  const handleDisablePush = async () => {
    setPushLoading(true);
    const ok = await unsubscribeFromPush();
    if (ok) { setPushSubscribed(false); toast({ title: "Notifications disabled" }); }
    setPushLoading(false);
  };

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

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel(`notifs:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "otechy_notifications", filter: `user_id=eq.${user.id}` },
        (payload) => { setNotifications(prev => [payload.new as Notification, ...prev]); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const markRead = async (id: string) => {
    await supabase.from("otechy_notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("otechy_notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast({ title: "All marked as read" });
  };

  const deleteNotif = async (id: string) => {
    await supabase.from("otechy_notifications").delete().eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unread = notifications.filter(n => !n.read).length;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 px-4">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
          <Bell className="w-7 h-7 text-purple-400" />
        </div>
        <p className="font-semibold text-foreground">Sign in to see notifications</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>
          <div>
            <h1 className="font-black text-lg text-foreground">Notifications</h1>
            <p className="text-xs text-muted-foreground">{unread > 0 ? `${unread} unread` : "All caught up"}</p>
          </div>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 px-3 py-1.5 rounded-xl border border-purple-500/30 hover:border-purple-500/60 transition-colors">
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      {/* Push notification toggle card */}
      {pushPermission !== "unsupported" && (
        <div className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border mb-4 ${
          pushSubscribed
            ? "bg-green-500/5 border-green-500/20"
            : "bg-purple-500/5 border-purple-500/20"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${pushSubscribed ? "bg-green-500/15" : "bg-purple-500/15"}`}>
              {pushSubscribed ? <Bell className="w-4.5 h-4.5 text-green-400" /> : <BellOff className="w-4.5 h-4.5 text-purple-400" />}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                {pushSubscribed ? "Push notifications ON" : "Get phone notifications"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {pushSubscribed
                  ? "You'll be notified even when the app is closed"
                  : "New books, scholarships & tips — straight to your phone"}
              </p>
            </div>
          </div>
          {pushPermission === "denied" ? (
            <p className="text-[10px] text-red-400 font-semibold shrink-0">Blocked in<br />browser settings</p>
          ) : (
            <button
              onClick={pushSubscribed ? handleDisablePush : handleEnablePush}
              disabled={pushLoading}
              className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 disabled:opacity-60 ${
                pushSubscribed
                  ? "bg-muted text-muted-foreground"
                  : "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md shadow-purple-500/20"
              }`}>
              {pushLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : pushSubscribed ? "Disable" : "Enable"}
            </button>
          )}
        </div>
      )}

      {/* Notification list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-purple-500" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Bell className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No notifications yet</p>
          <p className="text-sm text-muted-foreground">We'll notify you about scholarships, purchases, and more.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map(n => {
            const meta = TYPE_ICON[n.type] ?? TYPE_ICON.info;
            const Icon = meta.icon;
            return (
              <div
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={`relative flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer group ${
                  n.read
                    ? "bg-card border-border opacity-70 hover:opacity-100"
                    : "bg-card border-purple-500/30 shadow-sm shadow-purple-500/10 hover:border-purple-500/50"
                }`}
              >
                {!n.read && <div className="absolute top-3.5 right-3.5 w-2 h-2 bg-purple-500 rounded-full" />}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                  <Icon className={`w-4.5 h-4.5 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <p className={`text-sm font-semibold leading-snug ${n.read ? "text-muted-foreground" : "text-foreground"}`}>{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
