import { useEffect, useState } from "react";
import {
  X, Loader2, BadgeCheck, AlertTriangle, Trash2,
  Megaphone, LayoutGrid, LogOut, Video, School, Eye, Store, Briefcase,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { tutorsSupabase } from "@/lib/tutorsSupabase";
import { scholarshipsSupabase } from "@/lib/scholarshipsSupabase";
import { advertsSupabase } from "@/lib/advertsSupabase";
import { signOutAdmin, type AdminProfile } from "@/lib/adminAuth";
import { useToast } from "@/hooks/use-toast";
import { AdvertsAdmin } from "@/components/admin/AdvertsAdminForm";
import { UniversitiesAdmin } from "@/components/admin/UniversitiesAdmin";
import { BookshopApplicationsAdmin } from "@/components/admin/BookshopApplicationsAdmin";
import { JobsAdmin } from "@/components/admin/JobsAdmin";
import { getApplications } from "@/lib/bookshops";

interface AdminPanelProps {
  profile: AdminProfile;
  onClose: () => void;
}

type ContentRow = {
  id: string;
  label: string;        // name (tutor) or title (scholarship)
  is_verified: boolean;
  is_scam: boolean;
  scam_reason: string | null;
};

type Table = "otechy_tutors" | "otechy_scholarships";

// Each content section now lives on its own Supabase project.
const clientFor = (table: Table) => table === "otechy_tutors" ? tutorsSupabase : scholarshipsSupabase;

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

type AdConfig = {
  id?: string;
  is_enabled: boolean;
  days_of_week: string[];
  trigger_time: string;      // "HH:MM"
  countdown_seconds: number;
  title: string;
  image_url: string;
  link_url: string;
};

const EMPTY_AD_CONFIG: AdConfig = {
  is_enabled: false,
  days_of_week: [],
  trigger_time: "12:00",
  countdown_seconds: 5,
  title: "",
  image_url: "",
  link_url: "",
};

export function AdminPanel({ profile, onClose }: AdminPanelProps) {
  const [tab, setTab] = useState<"content" | "ads" | "adverts" | "universities" | "bookshops" | "jobs" | "stats">("content");
  const [pendingBookshops, setPendingBookshops] = useState(0);

  useEffect(() => {
    getApplications("pending").then(apps => setPendingBookshops(apps.length)).catch(() => {});
  }, [tab]);

  const handleClose = async () => {
    await signOutAdmin(); // never leave an admin session sitting open in the background
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999] bg-[hsl(215,55%,8%)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div>
          <p className="text-sm font-bold">Admin Panel</p>
          <p className="text-xs text-muted-foreground">{profile.name}</p>
        </div>
        <button onClick={handleClose} className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 shrink-0 overflow-x-auto scrollbar-hide">
        <TabButton active={tab === "content"} onClick={() => setTab("content")} icon={<LayoutGrid className="w-3.5 h-3.5" />} label="Content" />
        <TabButton active={tab === "ads"} onClick={() => setTab("ads")} icon={<Megaphone className="w-3.5 h-3.5" />} label="Ads" />
        <TabButton active={tab === "adverts"} onClick={() => setTab("adverts")} icon={<Video className="w-3.5 h-3.5" />} label="Adverts" />
        <TabButton active={tab === "universities"} onClick={() => setTab("universities")} icon={<School className="w-3.5 h-3.5" />} label="Universities" />
        <TabButton active={tab === "bookshops"} onClick={() => setTab("bookshops")} icon={<Store className="w-3.5 h-3.5" />} label="Bookshops" badge={pendingBookshops || undefined} />
        <TabButton active={tab === "jobs"} onClick={() => setTab("jobs")} icon={<Briefcase className="w-3.5 h-3.5" />} label="Jobs" />
        <TabButton active={tab === "stats"} onClick={() => setTab("stats")} icon={<Eye className="w-3.5 h-3.5" />} label="Stats" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {tab === "content" ? <ContentModeration />
          : tab === "ads" ? <AdConfigEditor adminId={profile.id} />
          : tab === "adverts" ? <AdvertsAdmin />
          : tab === "universities" ? <UniversitiesAdmin />
          : tab === "bookshops" ? <BookshopApplicationsAdmin />
          : tab === "jobs" ? <JobsAdmin />
          : <ViewStats />}
      </div>

      <button
        onClick={handleClose}
        className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-3 border-t border-border shrink-0"
      >
        <LogOut className="w-3.5 h-3.5" /> Log out of admin
      </button>
    </div>
  );
}

// ── View stats ──────────────────────────────────────────────────────
// Numbers come from two admin-only database functions (see
// main_project_stats.sql). Days are counted in Malawi time (Africa/Blantyre).
type Stats = {
  total_views: number; unique_visitors: number;
  views_today: number; visitors_today: number;
  views_7d: number; visitors_7d: number;
};
type DayRow = { stat_day: string; view_count: number; visitor_count: number; new_visitor_count: number };

function ViewStats() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [days, setDays] = useState<DayRow[]>([]);

  const load = async () => {
    setLoading(true);
    setError("");
    const [s, d] = await Promise.all([
      supabase.rpc("otechy_page_views_stats"),
      supabase.rpc("otechy_page_views_daily", { p_days: 14 }),
    ]);

    if (s.error || d.error) {
      const msg = (s.error ?? d.error)!.message;
      setError(msg);
      toast({ title: "Failed to load stats", description: msg, variant: "destructive" });
      setLoading(false);
      return;
    }

    const row: any = Array.isArray(s.data) ? s.data[0] : s.data;
    setStats({
      total_views: Number(row?.total_views) || 0,
      unique_visitors: Number(row?.unique_visitors) || 0,
      views_today: Number(row?.views_today) || 0,
      visitors_today: Number(row?.visitors_today) || 0,
      views_7d: Number(row?.views_7d) || 0,
      visitors_7d: Number(row?.visitors_7d) || 0,
    });
    setDays(((d.data as any[]) ?? []).map(r => ({
      stat_day: String(r.stat_day),
      view_count: Number(r.view_count) || 0,
      visitor_count: Number(r.visitor_count) || 0,
      new_visitor_count: Number(r.new_visitor_count) || 0,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  if (error) {
    return (
      <div className="pt-3 space-y-3">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <p className="text-sm font-bold text-red-400 mb-1">Stats could not be loaded</p>
          <p className="text-xs text-red-300/90 break-words">{error}</p>
          <p className="text-[11px] text-muted-foreground mt-2">
            If this mentions a missing function or table, run <span className="font-mono">main_project_stats.sql</span> in the main Supabase project.
          </p>
        </div>
        <button onClick={load} className="w-full text-xs font-semibold py-2.5 rounded-xl border border-border text-muted-foreground">Try again</button>
      </div>
    );
  }

  const cards = [
    { label: "Visitors today", value: stats?.visitors_today ?? 0, accent: true },
    { label: "Views today", value: stats?.views_today ?? 0, accent: true },
    { label: "Visitors (last 7 days)", value: stats?.visitors_7d ?? 0 },
    { label: "Views (last 7 days)", value: stats?.views_7d ?? 0 },
    { label: "Total unique visitors", value: stats?.unique_visitors ?? 0 },
    { label: "Total views", value: stats?.total_views ?? 0 },
  ];
  const maxVisitors = Math.max(1, ...days.map(d => d.visitor_count));

  return (
    <div className="pt-3 space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        {cards.map(c => (
          <div key={c.label} className={`rounded-2xl px-3.5 py-3 border ${c.accent ? "bg-blue-600/10 border-blue-500/30" : "bg-card border-border"}`}>
            <p className="text-[11px] font-semibold text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-black text-foreground mt-0.5">{c.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-3">
        <p className="text-xs font-bold text-foreground mb-2">Last 14 days</p>
        <div className="grid grid-cols-[64px_1fr_44px_44px_40px] gap-x-2 text-[10px] font-semibold text-muted-foreground pb-1.5 border-b border-border">
          <span>Day</span><span>Visitors</span><span className="text-right">Views</span><span className="text-right">Users</span><span className="text-right">New</span>
        </div>
        {days.map((d, i) => {
          const label = i === 0 ? "Today" : new Date(d.stat_day + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
          return (
            <div key={d.stat_day} className="grid grid-cols-[64px_1fr_44px_44px_40px] gap-x-2 items-center py-1.5 border-b border-border/50 last:border-0 text-xs">
              <span className={i === 0 ? "font-bold text-foreground" : "text-muted-foreground"}>{label}</span>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${(d.visitor_count / maxVisitors) * 100}%` }} />
              </div>
              <span className="text-right text-foreground">{d.view_count}</span>
              <span className="text-right font-semibold text-foreground">{d.visitor_count}</span>
              <span className="text-right text-emerald-500">{d.new_visitor_count}</span>
            </div>
          );
        })}
        <p className="text-[10px] text-muted-foreground mt-2">
          Users = different people (devices) that opened the app that day. New = first time ever seen. Days are in Malawi time.
        </p>
      </div>

      <button onClick={load} className="w-full text-xs font-semibold py-2.5 rounded-xl border border-border text-muted-foreground">Refresh</button>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
        active ? "bg-blue-600 text-white" : "bg-card border border-border text-muted-foreground"
      }`}
    >
      {icon} {label}
      {!!badge && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

// ── Content moderation (tutors + scholarships) ─────────────────────
function ContentModeration() {
  const { toast } = useToast();
  const [section, setSection] = useState<Table>("otechy_tutors");
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scamPromptId, setScamPromptId] = useState<string | null>(null);
  const [scamReasonDraft, setScamReasonDraft] = useState("");

  const load = async (table: Table) => {
    setLoading(true);
    const labelCol = table === "otechy_tutors" ? "name" : "title";
    const { data, error } = await clientFor(table)
      .from(table)
      .select(`id,${labelCol},is_verified,is_scam,scam_reason`)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows((data || []).map((r: any) => ({
        id: r.id,
        label: r[labelCol],
        is_verified: r.is_verified,
        is_scam: r.is_scam,
        scam_reason: r.scam_reason,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { load(section); }, [section]);

  const toggleVerify = async (row: ContentRow) => {
    const next = !row.is_verified;
    const { error } = await clientFor(section).from(section).update({
      is_verified: next,
      verified_at: next ? new Date().toISOString() : null,
    }).eq("id", row.id);

    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, is_verified: next } : r));
  };

  const clearScam = async (row: ContentRow) => {
    const { error } = await clientFor(section).from(section).update({ is_scam: false, scam_reason: null }).eq("id", row.id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, is_scam: false, scam_reason: null } : r));
  };

  const confirmScamFlag = async (row: ContentRow) => {
    if (!scamReasonDraft.trim()) return;
    const { error } = await clientFor(section).from(section).update({
      is_scam: true,
      scam_reason: scamReasonDraft.trim(),
    }).eq("id", row.id);

    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, is_scam: true, scam_reason: scamReasonDraft.trim() } : r));
    setScamPromptId(null);
    setScamReasonDraft("");
  };

  const handleDelete = async (row: ContentRow) => {
    if (!confirm(`Permanently delete "${row.label}"? This cannot be undone.`)) return;
    const { error } = await clientFor(section).from(section).delete().eq("id", row.id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    setRows(prev => prev.filter(r => r.id !== row.id));
    toast({ title: "Deleted" });
  };

  return (
    <div className="pt-3">
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setSection("otechy_tutors")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold ${section === "otechy_tutors" ? "bg-sky-600 text-white" : "bg-card border border-border text-muted-foreground"}`}
        >
          Tutors
        </button>
        <button
          onClick={() => setSection("otechy_scholarships")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold ${section === "otechy_scholarships" ? "bg-sky-600 text-white" : "bg-card border border-border text-muted-foreground"}`}
        >
          Scholarships
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-10">Nothing here yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(row => (
            <div key={row.id} className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-sm font-semibold truncate">{row.label}</p>
                  {row.is_verified && <BadgeCheck className="w-4 h-4 text-blue-400 shrink-0" />}
                  {row.is_scam && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
                </div>
                <button onClick={() => handleDelete(row)} className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>

              <div className="flex gap-2 mt-2.5">
                <button
                  onClick={() => toggleVerify(row)}
                  className={`flex-1 text-xs font-semibold py-1.5 rounded-lg border ${
                    row.is_verified ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "border-border text-muted-foreground"
                  }`}
                >
                  {row.is_verified ? "Verified ✓" : "Verify"}
                </button>

                {row.is_scam ? (
                  <button onClick={() => clearScam(row)} className="flex-1 text-xs font-semibold py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400">
                    Clear scam flag
                  </button>
                ) : (
                  <button
                    onClick={() => { setScamPromptId(row.id); setScamReasonDraft(""); }}
                    className="flex-1 text-xs font-semibold py-1.5 rounded-lg border border-border text-muted-foreground"
                  >
                    Flag as scam
                  </button>
                )}
              </div>

              {row.is_scam && row.scam_reason && (
                <p className="text-[11px] text-muted-foreground mt-2 italic">Internal note: {row.scam_reason}</p>
              )}

              {scamPromptId === row.id && (
                <div className="mt-2.5 space-y-2">
                  <textarea
                    autoFocus
                    value={scamReasonDraft}
                    onChange={e => setScamReasonDraft(e.target.value)}
                    placeholder="Internal reason (not shown publicly, only the warning badge is)…"
                    rows={2}
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmScamFlag(row)}
                      disabled={!scamReasonDraft.trim()}
                      className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-red-600 text-white disabled:opacity-50"
                    >
                      Confirm flag
                    </button>
                    <button
                      onClick={() => { setScamPromptId(null); setScamReasonDraft(""); }}
                      className="flex-1 text-xs font-semibold py-1.5 rounded-lg border border-border text-muted-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Ad configuration ────────────────────────────────────────────────
function AdConfigEditor({ adminId }: { adminId: string }) {
  const { toast } = useToast();
  const [config, setConfig] = useState<AdConfig>(EMPTY_AD_CONFIG);
  const [rowId, setRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    advertsSupabase.from("otechy_ad_config").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRowId(data.id);
          setConfig({
            is_enabled: data.is_enabled,
            days_of_week: data.days_of_week || [],
            trigger_time: (data.trigger_time || "12:00:00").slice(0, 5),
            countdown_seconds: data.countdown_seconds,
            title: data.title || "",
            image_url: data.image_url || "",
            link_url: data.link_url || "",
          });
        }
        setLoading(false);
      });
  }, []);

  const toggleDay = (day: string) => {
    setConfig(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day],
    }));
  };

  const save = async () => {
    setSaving(true);
    const payload = { ...config, created_by: adminId };
    const { data, error } = rowId
      ? await advertsSupabase.from("otechy_ad_config").update(payload).eq("id", rowId).select().single()
      : await advertsSupabase.from("otechy_ad_config").insert(payload).select().single();

    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    setRowId(data.id);
    toast({ title: "Ad settings saved" });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="pt-3 space-y-4 pb-4">
      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-3 py-2.5">
        <p className="text-sm font-semibold">Ad enabled</p>
        <button
          onClick={() => setConfig(p => ({ ...p, is_enabled: !p.is_enabled }))}
          className={`w-11 h-6 rounded-full relative transition-colors ${config.is_enabled ? "bg-blue-600" : "bg-muted"}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${config.is_enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Days it shows</p>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold capitalize ${
                config.days_of_week.includes(day) ? "bg-blue-600 text-white" : "bg-card border border-border text-muted-foreground"
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Trigger time</p>
        <input
          type="time"
          value={config.trigger_time}
          onChange={e => setConfig(p => ({ ...p, trigger_time: e.target.value }))}
          className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Countdown before close button appears (seconds)</p>
        <input
          type="number"
          min={1}
          max={60}
          value={config.countdown_seconds}
          onChange={e => setConfig(p => ({ ...p, countdown_seconds: Number(e.target.value) }))}
          className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Ad title (optional)</p>
        <input
          value={config.title}
          onChange={e => setConfig(p => ({ ...p, title: e.target.value }))}
          placeholder="e.g. Airtel Malawi — Data Bundle Offer"
          className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Ad image URL</p>
        <input
          value={config.image_url}
          onChange={e => setConfig(p => ({ ...p, image_url: e.target.value }))}
          placeholder="https://…"
          className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Link when the ad body is tapped</p>
        <input
          value={config.link_url}
          onChange={e => setConfig(p => ({ ...p, link_url: e.target.value }))}
          placeholder="https://…"
          className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl bg-blue-600 text-white active:scale-[0.98] disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save ad settings"}
      </button>
    </div>
  );
}
