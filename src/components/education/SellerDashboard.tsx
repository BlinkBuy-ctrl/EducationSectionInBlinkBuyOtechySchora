import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  TrendingUp, Download, Star, DollarSign,
  FileText, Loader2, Trash2, AlertTriangle,
  Users, Edit3, Check, X, ChevronRight, BookOpen,
  BadgeCheck, BarChart2, Sun, Moon, Bell, Bookmark,
  Info, LifeBuoy, Mail, RotateCcw, Settings2, ChevronDown, ChevronUp, Hand
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/storage";
import { triggerInstallPrompt, isAppInstalled } from "@/components/InstallPrompt";
import { VersionTapTrigger } from "@/components/admin/VersionTapTrigger";
import { AdminGestureGate } from "@/components/admin/AdminGestureGate";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { AdminPanel } from "@/components/admin/AdminPanel";
import type { AdminProfile } from "@/lib/adminAuth";

const APP_VERSION = "1.0.0"; // keep in sync with package.json
const NOTIF_PREF_KEY = "otechyschora_notifications_enabled";

interface Props { userId: string; onRefresh: () => void; }

const CAT_COLORS: Record<string, string> = {
  "Past Papers": "bg-blue-500/15 text-blue-400",
  "Textbooks":   "bg-purple-500/15 text-purple-400",
  "Notes":       "bg-green-500/15 text-green-400",
  "Research":    "bg-orange-500/15 text-orange-400",
  "Other":       "bg-gray-500/15 text-gray-400",
};

// ── Public name editor ────────────────────────────────────────────────────────
function ProfileNameEditor({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [name,    setName]    = useState("");
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState("");
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("name").eq("id", userId).single()
      .then(({ data }) => { if (data?.name) setName(data.name); });
  }, [userId]);

  const save = async () => {
    if (!draft.trim()) { toast({ title: "Name can't be empty", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({ id: userId, name: draft.trim() });
      if (error) throw error;
      setName(draft.trim());
      setEditing(false);
      toast({ title: "✅ Name updated!" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header strip */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
          <BadgeCheck className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <p className="text-xs font-bold text-foreground">Public Profile</p>
      </div>

      <div className="px-4 py-3">
        {/* Avatar initial */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-md shrink-0">
            <span className="text-white font-black text-base">
              {(name || "U")[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">Display name</p>
            {editing ? (
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                autoFocus
                maxLength={40}
                placeholder="Your public name"
                className="w-full bg-muted/50 border border-purple-500/40 rounded-lg px-2.5 py-1.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            ) : (
              <p className="text-sm font-bold text-foreground truncate">{name || "Not set"}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {editing ? (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-muted border border-border text-xs font-semibold text-muted-foreground active:scale-95 transition-all">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold active:scale-95 transition-all disabled:opacity-60 shadow-sm">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        ) : (
          <button onClick={() => { setDraft(name); setEditing(true); }}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-muted/50 border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all">
            <Edit3 className="w-3.5 h-3.5" /> Change Display Name
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export function SellerDashboard({ userId, onRefresh }: Props) {
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [, navigate] = useLocation();
  const [stats,      setStats]      = useState<any>(null);
  const [resources,  setResources]  = useState<any[]>([]);
  const [tutors,     setTutors]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const [activeTab,  setActiveTab]  = useState<"resources" | "tutors">("resources");
  const [showAllResources, setShowAllResources] = useState(false);
  const [showAllTutors,    setShowAllTutors]    = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(() => {
    const saved = safeGetItem(NOTIF_PREF_KEY);
    return saved === null ? true : saved === "1";
  });
  const [resetting, setResetting] = useState(false);
  const [showGesturesInfo, setShowGesturesInfo] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Hidden admin flow — "none" the entire time unless someone finds the
  // 7-tap trigger. Nothing here renders or runs until that happens.
  const [adminStage, setAdminStage] = useState<"none" | "gate" | "login" | "panel">("none");
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

  const handleInstallApp = async () => {
    setInstalling(true);
    try {
      const result = await triggerInstallPrompt();
      if (result === "accepted") toast({ title: "✅ Installing SchoraHub…" });
      else if (result === "dismissed") toast({ title: "Install cancelled" });
      else if (result === "already-installed") toast({ title: "✅ Already installed" });
      else toast({ title: "Install not available yet", description: "Browse the app for a moment, then try again — or use your browser menu → \"Add to Home screen\"." });
    } finally { setInstalling(false); }
  };

  const RESOURCE_PREVIEW_COUNT = 3;
  const TUTOR_PREVIEW_COUNT = 3;

  const toggleNotifications = () => {
    const next = !notifEnabled;
    setNotifEnabled(next);
    safeSetItem(NOTIF_PREF_KEY, next ? "1" : "0");
    toast({ title: next ? "🔔 Notifications on" : "🔕 Notifications off" });
  };

  const goToTab = (tab: string) => {
    window.dispatchEvent(new CustomEvent("otechy:set-tab", { detail: tab }));
  };

  const handleResetIdentity = async () => {
    if (!window.confirm("This will permanently delete YOUR uploaded resources, tutor profiles, and your profile identity (display name). It will NOT touch purchases, bookmarks, or other users' data. Continue?")) return;
    setResetting(true);
    try {
      const filePaths = resources.map(r => r.file_url).filter(Boolean);
      if (filePaths.length) {
        await supabase.storage.from("otechy-docs").remove(filePaths).catch(() => {});
      }
      await supabase.from("otechy_resources").delete().eq("uploader_id", userId);
      await supabase.from("otechy_tutors").delete().eq("user_id", userId);
      await supabase.from("profiles").delete().eq("id", userId);

      toast({ title: "✅ Your uploads and identity were reset" });
      load(); onRefresh();
    } catch (e: any) {
      toast({ title: "Reset failed", description: e.message, variant: "destructive" });
    } finally { setResetting(false); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, resourcesRes, tutorsRes] = await Promise.all([
        supabase.rpc("get_seller_stats", { p_user_id: userId }),
        supabase.from("otechy_resources")
          .select("id,title,category,price,download_count,avg_rating,review_count,created_at,file_url")
          .eq("uploader_id", userId)
          .order("created_at", { ascending: false }),
        supabase.from("otechy_tutors")
          .select("id,name,tagline,subjects,location,is_online,likes_count,created_at,is_active")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ]);
      if (statsRes.data)     setStats(statsRes.data);
      if (resourcesRes.data) setResources(resourcesRes.data);
      if (tutorsRes.data)    setTutors(tutorsRes.data);
    } catch (e: any) {
      toast({ title: "Failed to load dashboard", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [userId]);

  const handleDeleteResource = async (item: any) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setDeleting(item.id);
    try {
      await supabase.storage.from("otechy-docs").remove([item.file_url]);
      const { error } = await supabase.from("otechy_resources").delete().eq("id", item.id);
      if (error) throw error;
      toast({ title: "Deleted" });
      load(); onRefresh();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally { setDeleting(null); }
  };

  const handleDeleteTutor = async (item: any) => {
    if (!window.confirm(`Remove tutor profile "${item.name}"?`)) return;
    setDeleting(item.id);
    try {
      const { error } = await supabase.from("otechy_tutors").delete().eq("id", item.id);
      if (error) throw error;
      toast({ title: "Tutor profile removed" });
      load(); onRefresh();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally { setDeleting(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
    </div>
  );

  const statCards = [
    {
      icon: FileText,
      label: "Resources",
      value: stats?.total_resources ?? resources.length,
      color: "from-purple-500 to-blue-600",
      bg: "bg-purple-500/10",
    },
    {
      icon: Download,
      label: "Downloads",
      value: stats?.total_downloads ?? 0,
      color: "from-blue-500 to-cyan-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: DollarSign,
      label: "Earnings",
      value: `MK ${Number(stats?.total_earnings ?? 0).toLocaleString()}`,
      color: "from-green-500 to-emerald-500",
      bg: "bg-green-500/10",
    },
    {
      icon: Star,
      label: "Avg Rating",
      value: stats?.avg_rating > 0 ? `${Number(stats.avg_rating).toFixed(1)}★` : "—",
      color: "from-yellow-400 to-orange-500",
      bg: "bg-yellow-500/10",
    },
  ];

  return (
    <>
    <div className="flex flex-col gap-4">

      {/* Profile name editor */}
      <ProfileNameEditor userId={userId} />

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {statCards.map(s => (
          <div key={s.label}
            className="bg-card border border-border rounded-2xl p-3.5 flex items-center gap-3 overflow-hidden relative">
            {/* subtle gradient bg accent */}
            <div className={`absolute inset-0 opacity-[0.04] bg-gradient-to-br ${s.color} pointer-events-none`} />
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0 shadow-sm`}>
              <s.icon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
              <p className="text-sm font-black text-foreground truncate">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* My content — tabs */}
      <div>
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl mb-3">
          <button onClick={() => setActiveTab("resources")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "resources"
                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm"
                : "text-muted-foreground"
            }`}>
            <BookOpen className="w-3.5 h-3.5" /> Resources
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === "resources" ? "bg-white/20" : "bg-muted"}`}>
              {resources.length}
            </span>
          </button>
          <button onClick={() => setActiveTab("tutors")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "tutors"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm"
                : "text-muted-foreground"
            }`}>
            <Users className="w-3.5 h-3.5" /> Tutor Profiles
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === "tutors" ? "bg-white/20" : "bg-muted"}`}>
              {tutors.length}
            </span>
          </button>
        </div>

        {/* Resources list */}
        {activeTab === "resources" && (
          resources.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center bg-muted/20 rounded-2xl border border-border/50">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-sm font-semibold text-foreground">No uploads yet</p>
              <p className="text-xs text-muted-foreground">Hit Upload to share your first resource.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(showAllResources ? resources : resources.slice(0, RESOURCE_PREVIEW_COUNT)).map(item => (
                <div key={item.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground line-clamp-1">{item.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${CAT_COLORS[item.category] ?? CAT_COLORS["Other"]}`}>
                          {item.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Download className="w-2.5 h-2.5" /> {item.download_count ?? 0}
                        </span>
                        {item.review_count > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                            {Number(item.avg_rating).toFixed(1)}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold ml-auto ${Number(item.price) === 0 ? "text-emerald-400" : "text-foreground"}`}>
                          {Number(item.price) === 0 ? "Free" : `MK ${Number(item.price).toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteResource(item)}
                      disabled={deleting === item.id}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 shrink-0">
                      {deleting === item.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
              {resources.length > RESOURCE_PREVIEW_COUNT && (
                <button
                  onClick={() => setShowAllResources(v => !v)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-muted/40 border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
                  {showAllResources ? <>Show Less <ChevronUp className="w-3.5 h-3.5" /></> : <>Show More Files I Uploaded ({resources.length - RESOURCE_PREVIEW_COUNT} more) <ChevronDown className="w-3.5 h-3.5" /></>}
                </button>
              )}
            </div>
          )
        )}

        {/* Tutors list */}
        {activeTab === "tutors" && (
          tutors.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center bg-muted/20 rounded-2xl border border-border/50">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-sm font-semibold text-foreground">No tutor profiles yet</p>
              <p className="text-xs text-muted-foreground">Register as a tutor from the Tutors tab.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(showAllTutors ? tutors : tutors.slice(0, TUTOR_PREVIEW_COUNT)).map(item => (
                <div key={item.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                        {item.is_online && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 shrink-0">Online</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {(item.subjects ?? []).slice(0, 2).map((s: string) => (
                          <span key={s} className="text-[9px] font-semibold bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-full">{s}</span>
                        ))}
                        {(item.subjects ?? []).length > 2 && (
                          <span className="text-[9px] text-muted-foreground">+{item.subjects.length - 2}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-red-400 text-red-400" /> {item.likes_count ?? 0}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTutor(item)}
                      disabled={deleting === item.id}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 shrink-0">
                      {deleting === item.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
              {tutors.length > TUTOR_PREVIEW_COUNT && (
                <button
                  onClick={() => setShowAllTutors(v => !v)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-muted/40 border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
                  {showAllTutors ? <>Show Less <ChevronUp className="w-3.5 h-3.5" /></> : <>Show More ({tutors.length - TUTOR_PREVIEW_COUNT} more) <ChevronDown className="w-3.5 h-3.5" /></>}
                </button>
              )}
            </div>
          )
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-yellow-500/8 border border-yellow-500/20 rounded-xl px-3 py-2.5">
        <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-yellow-600 dark:text-yellow-400 leading-relaxed">
          Earnings shown are recorded purchases. Payouts are processed manually — contact SchoraHub to request a withdrawal.
        </p>
      </div>

      {/* ── Settings & More ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-bold text-foreground">Settings & More</p>
        </div>

        <div className="flex flex-col gap-3">

          {/* Appearance */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <p className="px-4 pt-3 pb-1 text-[9px] font-black tracking-[0.2em] uppercase text-muted-foreground">Appearance</p>
            <button onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
                {theme === "dark" ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-purple-400" />}
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold text-foreground">Theme</p>
                <p className="text-[10px] text-muted-foreground">{theme === "dark" ? "Dark mode" : "Light mode"}</p>
              </div>
              <div className={`w-10 h-6 rounded-full p-0.5 transition-colors ${theme === "dark" ? "bg-purple-600" : "bg-muted"}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${theme === "dark" ? "translate-x-4" : "translate-x-0"}`} />
              </div>
            </button>
          </div>

          {/* Notifications */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <p className="px-4 pt-3 pb-1 text-[9px] font-black tracking-[0.2em] uppercase text-muted-foreground">Notifications</p>

            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-foreground">Push Notifications</p>
                <p className="text-[10px] text-muted-foreground">{notifEnabled ? "On" : "Off"} — show alerts for downloads, purchases & more</p>
              </div>
              <button onClick={toggleNotifications}
                className={`w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 ${notifEnabled ? "bg-blue-600" : "bg-muted"}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${notifEnabled ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>

            <button onClick={() => navigate("/notifications")}
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition-colors border-b border-border/60">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-blue-400" />
              </div>
              <p className="flex-1 text-left text-xs font-bold text-foreground">View Notifications</p>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>

            <button onClick={() => goToTab("bookmarks")}
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Bookmark className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="flex-1 text-left text-xs font-bold text-foreground">Saved / Bookmarks</p>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </div>

          {/* Support & Info */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <p className="px-4 pt-3 pb-1 text-[9px] font-black tracking-[0.2em] uppercase text-muted-foreground">Support & Info</p>

            <button onClick={() => goToTab("aboutus")}
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition-colors border-b border-border/60">
              <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                <Info className="w-4 h-4 text-violet-400" />
              </div>
              <p className="flex-1 text-left text-xs font-bold text-foreground">About Us</p>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>

            <button onClick={() => goToTab("aboutus")}
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition-colors border-b border-border/60">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0">
                <LifeBuoy className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold text-foreground">Help Center</p>
                <p className="text-[10px] text-muted-foreground">Email & phone support</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>

            <a href="mailto:otechy8@gmail.com"
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition-colors border-b border-border/60">
              <div className="w-8 h-8 rounded-lg bg-pink-500/15 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-pink-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold text-foreground">Contact / Support</p>
                <p className="text-[10px] text-muted-foreground">otechy8@gmail.com</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </a>

            <button onClick={handleResetIdentity} disabled={resetting}
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition-colors border-b border-border/60 disabled:opacity-50">
              <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                {resetting ? <Loader2 className="w-4 h-4 text-red-400 animate-spin" /> : <RotateCcw className="w-4 h-4 text-red-400" />}
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold text-foreground">Reset My Uploads & Identity</p>
                <p className="text-[10px] text-muted-foreground">Clears your uploads & profile only</p>
              </div>
            </button>

            {/* Gestures */}
            <button onClick={() => setShowGesturesInfo(v => !v)}
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition-colors border-b border-border/60">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
                <Hand className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold text-foreground">Gestures</p>
                <p className="text-[10px] text-muted-foreground">How the scroll-hint gesture works</p>
              </div>
              {showGesturesInfo ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
            </button>

            {showGesturesInfo && (
              <div className="px-4 py-4 bg-muted/20 border-b border-border/60">
                <p className="text-[11px] font-bold text-foreground mb-1">Triple-Tap Scroll Hint Toggle</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                  The Browse tabs row and the category filter row (Textbooks, Notes, Research…) gently
                  slide left and right on their own, as a hint that you can scroll them. Tap either row
                  <span className="font-bold text-foreground"> three times quickly</span> (within about
                  half a second) to turn that hint animation off — and triple-tap again to turn it back on.
                </p>
                <svg viewBox="0 0 300 110" className="w-full max-w-[280px] mx-auto" xmlns="http://www.w3.org/2000/svg">
                  <rect x="10" y="35" width="280" height="40" rx="14" fill="currentColor" className="text-muted opacity-40" />
                  {[70, 150, 230].map((cx, i) => (
                    <g key={cx}>
                      <circle cx={cx} cy="55" r="16" fill="none" stroke="currentColor" className="text-indigo-400" strokeWidth="2" />
                      <text x={cx} y="60" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor" className="text-indigo-400">{i + 1}</text>
                    </g>
                  ))}
                  <path d="M90 55 L134 55" stroke="currentColor" className="text-indigo-300" strokeWidth="2" markerEnd="url(#arrow)" />
                  <path d="M170 55 L214 55" stroke="currentColor" className="text-indigo-300" strokeWidth="2" markerEnd="url(#arrow)" />
                  <defs>
                    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                      <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" className="text-indigo-300" />
                    </marker>
                  </defs>
                  <text x="150" y="98" textAnchor="middle" fontSize="10" fontWeight="600" fill="currentColor" className="text-muted-foreground">Tap · Tap · Tap — fast, same spot</text>
                </svg>
              </div>
            )}

            {/* Install App */}
            <button onClick={handleInstallApp} disabled={installing || isAppInstalled()}
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition-colors border-b border-border/60 disabled:opacity-50">
              <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
                {installing ? <Loader2 className="w-4 h-4 text-green-400 animate-spin" /> : <Download className="w-4 h-4 text-green-400" />}
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold text-foreground">{isAppInstalled() ? "App Installed" : "Install App"}</p>
                <p className="text-[10px] text-muted-foreground">{isAppInstalled() ? "Already on your home screen" : "Adds SchoraHub to your home screen"}</p>
              </div>
            </button>

            <VersionTapTrigger onUnlock={() => setAdminStage("gate")}>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <BarChart2 className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="flex-1 text-xs font-bold text-muted-foreground">App Version</p>
                <p className="text-xs font-semibold text-muted-foreground">v{APP_VERSION}</p>
              </div>
            </VersionTapTrigger>
          </div>

          {/* Footer */}
          <div className="flex flex-col items-center gap-1 pt-2 pb-1">
            <p className="text-[11px] text-muted-foreground font-semibold">Powered By OTECHY</p>
            <p className="text-[10px] text-muted-foreground/60">© {new Date().getFullYear()} Otechy · All rights reserved</p>
          </div>

        </div>
      </div>
    </div>

    {adminStage === "gate" && (
      <AdminGestureGate
        onReject={() => setAdminStage("none")}
        onContinue={() => setAdminStage("login")}
      />
    )}

    {adminStage === "login" && (
      <AdminLoginForm
        onSuccess={(profile) => { setAdminProfile(profile); setAdminStage("panel"); }}
        onCancel={() => setAdminStage("none")}
      />
    )}

    {adminStage === "panel" && adminProfile && (
      <AdminPanel
        profile={adminProfile}
        onClose={() => { setAdminProfile(null); setAdminStage("none"); }}
      />
    )}
    </>
  );
}
