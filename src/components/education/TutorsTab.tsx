import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Users, Heart, Phone, Mail, MapPin, BookOpen,
  Plus, X, Upload, Loader2, Wifi, WifiOff,
  MessageSquare, ChevronRight, Star, AlertTriangle, Shield, Check, School
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TutorDetailModal } from "@/components/education/TutorDetailModal";
import { AnimatedSearchInput } from "@/components/education/AnimatedSearchInput";
import { useToast } from "@/hooks/use-toast";

const TUTOR_SEARCH_PHRASES = [
  "Search Maths tutor…",
  "Search Physics tutor…",
  "Search Online tutor…",
  "Search Chichewa tutor…",
  "Search Biology tutor…",
  "Search by location…",
];

interface Props {
  tutors: any[];
  loading: boolean;
  user: any;
  onRefresh: () => void;
  ensureProfile?: () => Promise<void>;
}

// ── Registration Form ────────────────────────────────────────────────────────
function TutorRegisterForm({ user, onSuccess, onClose, ensureProfile }: {
  user: any; onSuccess: () => void; onClose: () => void; ensureProfile?: () => Promise<void>;
}) {
  const { toast } = useToast();
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [saving,     setSaving]     = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPrev, setAvatarPrev] = useState<string | null>(null);
  const [bannerPrev, setBannerPrev] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", tagline: "", bio: "", subjects: "",
    contact: "", whatsapp: "", email: "",
    location: "", price_range: "", is_online: true,
  });

  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  const pickImg = (ref: React.RefObject<HTMLInputElement | null>, cb: (f: File) => void) => {
    ref.current?.click();
    ref.current?.addEventListener("change", () => {
      const f = ref.current?.files?.[0];
      if (f) cb(f);
    }, { once: true });
  };

  const uploadImg = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("otechy-images").upload(path, file, { upsert: true });
    if (error) throw error;
    return supabase.storage.from("otechy-images").getPublicUrl(path).data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!form.name || !form.bio || !form.contact || !form.subjects) {
      toast({ title: "Name, bio, subjects & contact required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      if (ensureProfile) await ensureProfile();
      const [avatar_url, banner_url] = await Promise.all([
        avatarFile ? uploadImg(avatarFile, "avatars") : Promise.resolve(null),
        bannerFile ? uploadImg(bannerFile, "banners") : Promise.resolve(null),
      ]);
      const subjects = form.subjects.split(",").map(s => s.trim()).filter(Boolean);
      const { error } = await supabase.from("otechy_tutors").insert({
        user_id: user.id, name: form.name, tagline: form.tagline || null,
        bio: form.bio, subjects, contact: form.contact,
        whatsapp: form.whatsapp || null, email: form.email || null,
        location: form.location || null, price_range: form.price_range || null,
        is_online: form.is_online, avatar_url, banner_url, is_active: true,
      });
      if (error) throw error;
      toast({ title: "👨‍🏫 Tutor profile posted!" });
      onSuccess(); onClose();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const inp = "w-full bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all";

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 0px) + 12px)" }}>
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg flex flex-col"
        style={{ height: "85vh", maxHeight: "85vh" }}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <h2 className="font-bold text-sm">Register as Tutor</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center active:scale-90 transition-transform">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 flex flex-col gap-3">
            <div className="relative mb-5">
              <div onClick={() => pickImg(bannerRef, f => { setBannerFile(f); setBannerPrev(URL.createObjectURL(f)); })}
                className="h-24 rounded-xl border-2 border-dashed border-border cursor-pointer overflow-hidden bg-muted/30 hover:border-blue-500/40 transition-colors">
                {bannerPrev
                  ? <img src={bannerPrev} className="w-full h-full object-cover" />
                  : <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground">
                      <Upload className="w-4 h-4" /><span className="text-[11px]">Banner (optional)</span>
                    </div>}
              </div>
              <div onClick={() => pickImg(avatarRef, f => { setAvatarFile(f); setAvatarPrev(URL.createObjectURL(f)); })}
                className="absolute -bottom-5 left-3 w-12 h-12 rounded-xl border-2 border-card bg-gradient-to-br from-blue-600 to-purple-600 overflow-hidden cursor-pointer shadow-lg">
                {avatarPrev
                  ? <img src={avatarPrev} className="w-full h-full object-cover" />
                  : <div className="flex items-center justify-center h-full"><Upload className="w-4 h-4 text-white" /></div>}
              </div>
            </div>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" />
            <input ref={bannerRef} type="file" accept="image/*" className="hidden" />
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full name *" className={inp} />
            <input value={form.tagline} onChange={e => set("tagline", e.target.value)} placeholder="Tagline (e.g. MSCE Maths Specialist)" className={inp} />
            <textarea value={form.bio} onChange={e => set("bio", e.target.value)}
              placeholder="Describe your experience, qualifications, teaching approach… *"
              rows={3} className={`${inp} resize-none`} />
            <input value={form.subjects} onChange={e => set("subjects", e.target.value)} placeholder="Subjects (e.g. Maths, Physics, English) *" className={inp} />
            <input value={form.price_range} onChange={e => set("price_range", e.target.value)} placeholder="Rate (e.g. MK 3,000–5,000/hr)" className={inp} />
            <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Location (e.g. Blantyre, Limbe)" className={inp} />
            <div className="grid grid-cols-2 gap-2">
              <input value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="WhatsApp" className={inp} />
              <input value={form.email} onChange={e => set("email", e.target.value)} placeholder="Email" className={inp} />
            </div>
            <input value={form.contact} onChange={e => set("contact", e.target.value)} placeholder="Primary phone *" className={inp} />
            <div className="flex items-center justify-between bg-muted/30 rounded-xl px-3 py-2.5">
              <div>
                <p className="text-xs font-semibold text-foreground">Available Online</p>
                <p className="text-[10px] text-muted-foreground">Can teach via video call</p>
              </div>
              <div onClick={() => set("is_online", !form.is_online)}
                className={`w-10 h-6 rounded-full cursor-pointer transition-colors relative ${form.is_online ? "bg-blue-600" : "bg-border"}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.is_online ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2.5">
              <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5 fill-blue-400" />
              <p className="text-[11px] text-blue-400 leading-relaxed">
                <span className="font-bold">Get verified and find more students</span> — reach out to the Otechy team from About Us in My Stats and we'll review your profile for the blue verified badge.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-border shrink-0">
          <button onClick={handleSubmit} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold py-3 rounded-xl disabled:opacity-60 active:scale-[0.98] transition-all shadow-md shadow-blue-500/20">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            {saving ? "Posting…" : "Post Tutor Profile"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Tutor Card — horizontal layout, no overlap issues ───────────────────────
function TutorCard({ t, user, onOpen }: { t: any; user: any; onOpen: (t: any) => void }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(t.likes_count ?? 0);

  useEffect(() => {
    supabase.from("otechy_tutor_likes")
      .select("id").eq("tutor_id", t.id).eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setLiked(true); });
  }, [t.id, user.id]);

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (liked) {
      await supabase.from("otechy_tutor_likes").delete().eq("tutor_id", t.id).eq("user_id", user.id);
      setLikes((l: number) => l - 1); setLiked(false);
    } else {
      await supabase.from("otechy_tutor_likes").insert({ tutor_id: t.id, user_id: user.id });
      setLikes((l: number) => l + 1); setLiked(true);
    }
  };

  const grads = [
    "from-violet-600 to-blue-600",
    "from-blue-600 to-cyan-500",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-red-500",
    "from-rose-500 to-pink-600",
  ];
  const grad = grads[(t.name?.charCodeAt(0) ?? 0) % grads.length];

  return (
    <div
      onClick={() => onOpen(t)}
      className="bg-card border border-border rounded-2xl overflow-hidden active:scale-[0.99] transition-all cursor-pointer"
      style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06), 0 0 0 0px rgba(139,92,246,0)" }}
    >
      {/* Top section — identity */}
      <div className="flex items-center gap-3 p-3.5 pb-3">
        {/* Avatar — clean square, no overlap */}
        <div className="shrink-0 relative">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} overflow-hidden flex items-center justify-center shadow-md`}>
            {t.avatar_url
              ? <img src={t.avatar_url} alt={t.name} className="w-full h-full object-cover" />
              : <School className="w-6 h-6 text-white" />
            }
          </div>
          {/* Online dot */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${t.is_online ? "bg-green-400" : "bg-gray-400"}`} />
        </div>

        {/* Name + tagline */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h3 className="font-bold text-sm text-foreground truncate leading-tight">{t.name}</h3>
            {t.is_verified && (
              <span className="inline-flex items-center gap-1 shrink-0">
                <span className="relative w-3.5 h-3.5 flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                  <Check className="w-2 h-2 text-white absolute" strokeWidth={3.5} />
                </span>
                <span className="text-[9px] font-bold text-blue-600">Verified</span>
              </span>
            )}
            {t.is_scam && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 shrink-0">
                <AlertTriangle className="w-2.5 h-2.5" /> Reported
              </span>
            )}
          </div>
          {t.tagline
            ? <p className="text-[11px] text-muted-foreground truncate mt-0.5 leading-tight">{t.tagline}</p>
            : <p className="text-[11px] text-muted-foreground mt-0.5">Tutor</p>
          }
          <div className="flex items-center gap-2 mt-1">
            {t.is_online
              ? <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-500"><Wifi className="w-2.5 h-2.5" /> Online</span>
              : <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><WifiOff className="w-2.5 h-2.5" /> In-person</span>
            }
            {t.location && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <MapPin className="w-2.5 h-2.5" /> {t.location}
              </span>
            )}
          </div>
        </div>

        {/* Price + arrow */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          {t.price_range && (
            <span className="text-[10px] font-black text-green-500 leading-tight text-right">{t.price_range}</span>
          )}
          <div className="w-6 h-6 rounded-lg bg-muted/60 flex items-center justify-center">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Banner image — only if uploaded, shows in full (no cropping) with a soft blurred backdrop */}
      {t.banner_url && (
        <div className="mx-3 mb-2 rounded-xl overflow-hidden relative bg-muted/30" style={{ height: 110 }}>
          <img src={t.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-40" />
          <img src={t.banner_url} alt="" className="relative w-full h-full object-contain" />
        </div>
      )}

      {/* Subjects */}
      {(t.subjects ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 px-3.5 mb-2.5">
          {(t.subjects ?? []).slice(0, 4).map((s: string) => (
            <span key={s} className="flex items-center gap-0.5 text-[9px] font-bold bg-blue-500/10 text-blue-500 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/15">
              <BookOpen className="w-2.5 h-2.5" /> {s}
            </span>
          ))}
          {(t.subjects ?? []).length > 4 && (
            <span className="text-[9px] text-muted-foreground px-1 py-0.5">+{t.subjects.length - 4} more</span>
          )}
        </div>
      )}

      {/* Bio */}
      <p className="text-[11px] text-muted-foreground px-3.5 mb-3 line-clamp-2 leading-relaxed">{t.bio}</p>

      {/* Action bar */}
      <div className="flex items-center gap-1.5 px-3 pb-3 pt-2 border-t border-border/60">
        <button onClick={toggleLike}
          className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all active:scale-90 ${liked ? "text-red-400 bg-red-500/10 border border-red-500/20" : "text-muted-foreground bg-muted/40 border border-transparent"}`}>
          <Heart className={`w-3 h-3 ${liked ? "fill-red-400" : ""}`} /> {likes}
        </button>
        <div className="flex-1" />
        {t.whatsapp && (
          <a href={`https://wa.me/${t.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg active:scale-95 transition-all text-white"
            style={{ background: "linear-gradient(135deg,#25d366,#128c7e)" }}>
            <MessageSquare className="w-3 h-3" /> Chat
          </a>
        )}
        {t.contact && (
          <a href={`tel:${t.contact}`} onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg active:scale-95 transition-all text-white"
            style={{ background: "linear-gradient(135deg,#3b82f6,#6366f1)" }}>
            <Phone className="w-3 h-3" /> Call
          </a>
        )}
        {t.email && (
          <a href={`mailto:${t.email}`} onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg active:scale-95 transition-all text-white"
            style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}>
            <Mail className="w-3 h-3" /> Email
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export function TutorsTab({ tutors, loading, user, onRefresh, ensureProfile }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [filter,   setFilter]   = useState<"all" | "online" | "offline" | "verified">("all");

  const filtered = tutors.filter(t => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      t.name?.toLowerCase().includes(q) ||
      (t.subjects ?? []).some((s: string) => s.toLowerCase().includes(q)) ||
      t.bio?.toLowerCase().includes(q) ||
      t.location?.toLowerCase().includes(q);
    const matchF =
      filter === "all" ? true :
      filter === "online" ? t.is_online :
      filter === "offline" ? !t.is_online :
      !!t.is_verified;
    return matchQ && matchF;
  });

  const onlineCount   = tutors.filter(t => t.is_online).length;
  const offlineCount  = tutors.filter(t => !t.is_online).length;
  const verifiedCount = tutors.filter(t => t.is_verified).length;

  // Client-side autocomplete pool — built from data already loaded, no extra fetch.
  const searchSuggestions = useMemo(() => {
    const subjects  = tutors.flatMap(t => t.subjects ?? []);
    const names     = tutors.map(t => t.name).filter(Boolean);
    const locations = tutors.map(t => t.location).filter(Boolean);
    return [...new Set([...subjects, ...names, ...locations])];
  }, [tutors]);

  return (
    <div className="flex flex-col gap-3">
      {/* Search + Register */}
      <div className="flex items-center gap-2">
        <AnimatedSearchInput
          value={search}
          onChange={setSearch}
          phrases={TUTOR_SEARCH_PHRASES}
          ringColorClass="focus:ring-blue-500/40"
          className="flex-1"
          ariaLabel="Search tutors or subjects"
          suggestionPool={searchSuggestions}
        />
        <button onClick={() => setShowForm(true)}
          className="shrink-0 flex items-center gap-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-3 py-2.5 rounded-xl active:scale-[0.97] transition-all shadow-sm shadow-blue-500/20">
          <Plus className="w-3.5 h-3.5" /> Register
        </button>
      </div>

      {/* Filter pills */}
      {tutors.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto">
          {([
            { key: "all",      label: `All · ${tutors.length}` },
            { key: "online",   label: `🟢 Online · ${onlineCount}` },
            { key: "offline",  label: `⚫ Offline · ${offlineCount}` },
            { key: "verified", label: `Verified · ${verifiedCount}` },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${filter === f.key ? "bg-blue-600 border-blue-600 text-white" : "border-border text-muted-foreground bg-background"}`}>
              {f.key === "verified" && (
                <span className="relative w-3 h-3 flex items-center justify-center shrink-0">
                  <Shield className={`w-3 h-3 fill-current ${filter === f.key ? "text-white" : "text-blue-500"}`} />
                  <Check className="w-1.5 h-1.5 text-white absolute" strokeWidth={4} style={filter === f.key ? { color: "#2563eb" } : undefined} />
                </span>
              )}
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <p className="font-semibold text-sm text-foreground">{search ? "No tutors match" : "No tutors yet"}</p>
          <p className="text-xs text-muted-foreground">{search ? "Try a different search." : "Be the first to register!"}</p>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl active:scale-[0.98] transition-all">
            <Plus className="w-3.5 h-3.5" /> Register as Tutor
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(t => <TutorCard key={t.id} t={t} user={user} onOpen={setSelected} />)}
        </div>
      )}

      {/* Verification CTA */}
      <a
        href="https://wa.me/265999626944"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 text-xs font-bold text-blue-500 active:scale-[0.98] transition-all py-2"
      >
        <Shield className="w-3.5 h-3.5" /> Want to Get Verified as a Tutor? Click Here
      </a>

      {showForm && <TutorRegisterForm user={user} onSuccess={onRefresh} onClose={() => setShowForm(false)} ensureProfile={ensureProfile} />}
      {selected  && <TutorDetailModal t={selected} user={user} onClose={() => setSelected(null)} />}
    </div>
  );
}
