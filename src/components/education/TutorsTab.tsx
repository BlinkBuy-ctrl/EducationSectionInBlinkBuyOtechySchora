import { useState, useRef } from "react";
import {
  Users, Heart, Phone, Mail, MapPin, BookOpen,
  Plus, X, Upload, Loader2, Search, Wifi, WifiOff,
  MessageSquare, BadgeCheck, Star, ChevronRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TutorDetailModal } from "@/components/education/TutorDetailModal";
import { useToast } from "@/hooks/use-toast";

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
  const [saving, setSaving]       = useState(false);
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

  const inputCls = "w-full bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg flex flex-col"
        style={{ height: "92dvh", maxHeight: "92dvh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <h2 className="font-bold text-sm text-foreground">Register as Tutor</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground active:scale-90 transition-transform">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 flex flex-col gap-3">
            {/* Banner + Avatar */}
            <div className="relative mb-6">
              <div onClick={() => pickImg(bannerRef, f => { setBannerFile(f); setBannerPrev(URL.createObjectURL(f)); })}
                className="h-24 rounded-xl border-2 border-dashed border-border hover:border-blue-500/50 cursor-pointer overflow-hidden transition-colors bg-muted/30">
                {bannerPrev
                  ? <img src={bannerPrev} className="w-full h-full object-cover" />
                  : <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground">
                      <Upload className="w-4 h-4" /><span className="text-[11px]">Banner image (optional)</span>
                    </div>
                }
              </div>
              <div onClick={() => pickImg(avatarRef, f => { setAvatarFile(f); setAvatarPrev(URL.createObjectURL(f)); })}
                className="absolute -bottom-5 left-3 w-12 h-12 rounded-xl border-2 border-card bg-gradient-to-br from-blue-600 to-purple-600 overflow-hidden cursor-pointer shadow-lg">
                {avatarPrev
                  ? <img src={avatarPrev} className="w-full h-full object-cover" />
                  : <div className="flex items-center justify-center h-full"><Upload className="w-4 h-4 text-white" /></div>
                }
              </div>
            </div>

            <input ref={avatarRef} type="file" accept="image/*" className="hidden" />
            <input ref={bannerRef} type="file" accept="image/*" className="hidden" />

            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full name *" className={inputCls} />
            <input value={form.tagline} onChange={e => set("tagline", e.target.value)} placeholder="Tagline (e.g. MSCE Maths Specialist)" className={inputCls} />
            <textarea value={form.bio} onChange={e => set("bio", e.target.value)}
              placeholder="Describe your experience, qualifications, teaching style… *"
              rows={3} className={`${inputCls} resize-none`} />
            <input value={form.subjects} onChange={e => set("subjects", e.target.value)} placeholder="Subjects (e.g. Maths, Physics, English) *" className={inputCls} />
            <input value={form.price_range} onChange={e => set("price_range", e.target.value)} placeholder="Price range (e.g. MK 3,000–5,000/hr)" className={inputCls} />
            <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Location (e.g. Blantyre, Limbe)" className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <input value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="WhatsApp number" className={inputCls} />
              <input value={form.email} onChange={e => set("email", e.target.value)} placeholder="Email" className={inputCls} />
            </div>
            <input value={form.contact} onChange={e => set("contact", e.target.value)} placeholder="Primary phone / contact *" className={inputCls} />

            {/* Online toggle */}
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
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border shrink-0">
          <button onClick={handleSubmit} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold py-3 rounded-xl disabled:opacity-60 active:scale-[0.98] transition-all shadow-md shadow-blue-500/20">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            {saving ? "Posting…" : "Post Tutor Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tutor Card ───────────────────────────────────────────────────────────────
function TutorCard({ t, user, onOpen }: { t: any; user: any; onOpen: (t: any) => void }) {
  const { toast } = useToast();
  const [likes,   setLikes]   = useState(t.likes ?? 0);
  const [liked,   setLiked]   = useState(false);

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !liked;
    setLiked(next);
    setLikes((l: number) => l + (next ? 1 : -1));
    await supabase.from("otechy_tutors").update({ likes: likes + (next ? 1 : -1) }).eq("id", t.id);
  };

  const initials = t.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "T";

  // Gradient based on first letter
  const gradients = [
    "from-blue-600 to-purple-600",
    "from-purple-600 to-pink-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-red-600",
    "from-cyan-500 to-blue-600",
  ];
  const grad = gradients[(t.name?.charCodeAt(0) ?? 0) % gradients.length];

  return (
    <div onClick={() => onOpen(t)}
      className="bg-card border border-border rounded-2xl overflow-hidden active:scale-[0.99] transition-all cursor-pointer"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

      {/* Banner */}
      <div className="relative h-24 bg-gradient-to-br from-blue-900/40 to-purple-900/30 overflow-hidden">
        {t.banner_url
          ? <img src={t.banner_url} alt="" className="w-full h-full object-cover" />
          : <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/15 to-transparent" />
        }
        {/* Online badge top-right */}
        <div className="absolute top-2 right-2">
          {t.is_online
            ? <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 backdrop-blur-sm text-green-400 border border-green-500/30">
                <Wifi className="w-2.5 h-2.5" /> Online
              </span>
            : <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-black/30 backdrop-blur-sm text-white/50 border border-white/10">
                <WifiOff className="w-2.5 h-2.5" /> Offline
              </span>
          }
        </div>
      </div>

      {/* Avatar overlapping banner */}
      <div className="px-3 -mt-6 mb-2">
        <div className={`w-12 h-12 rounded-xl border-2 border-card bg-gradient-to-br ${grad} overflow-hidden flex items-center justify-center shadow-md`}>
          {t.avatar_url
            ? <img src={t.avatar_url} alt={t.name} className="w-full h-full object-cover" />
            : <span className="text-white text-sm font-black">{initials}</span>
          }
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-3 flex flex-col gap-2">
        {/* Name + verified */}
        <div>
          <div className="flex items-center gap-1">
            <h3 className="font-bold text-sm text-foreground truncate">{t.name}</h3>
            {t.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
          </div>
          {t.tagline && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{t.tagline}</p>}
        </div>

        {/* Subjects */}
        {(t.subjects ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(t.subjects ?? []).slice(0, 3).map((s: string) => (
              <span key={s} className="flex items-center gap-0.5 text-[9px] font-semibold bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-full">
                <BookOpen className="w-2.5 h-2.5" /> {s}
              </span>
            ))}
            {(t.subjects ?? []).length > 3 && (
              <span className="text-[9px] text-muted-foreground px-1.5 py-0.5">+{t.subjects.length - 3}</span>
            )}
          </div>
        )}

        {/* Location + price */}
        <div className="flex items-center gap-2 flex-wrap">
          {t.location && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <MapPin className="w-2.5 h-2.5" /> {t.location}
            </span>
          )}
          {t.price_range && (
            <span className="text-[10px] font-bold text-green-400">{t.price_range}</span>
          )}
        </div>

        {/* Bio preview */}
        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{t.bio}</p>

        {/* Action row */}
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/50">
          {/* Like */}
          <button onClick={toggleLike}
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg transition-all active:scale-90 ${liked ? "text-red-400 bg-red-500/10" : "text-muted-foreground hover:text-red-400 hover:bg-red-500/10"}`}>
            <Heart className={`w-3 h-3 ${liked ? "fill-red-400" : ""}`} /> {likes}
          </button>

          <div className="flex-1" />

          {/* WhatsApp */}
          {t.whatsapp && (
            <a href={`https://wa.me/${t.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-green-500/10 text-green-400 rounded-lg active:scale-95 transition-all border border-green-500/20">
              <MessageSquare className="w-3 h-3" /> Chat
            </a>
          )}
          {t.contact && (
            <a href={`tel:${t.contact}`} onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg active:scale-95 transition-all border border-blue-500/20">
              <Phone className="w-3 h-3" /> Call
            </a>
          )}
          {t.email && (
            <a href={`mailto:${t.email}`} onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-purple-500/10 text-purple-400 rounded-lg active:scale-95 transition-all border border-purple-500/20">
              <Mail className="w-3 h-3" /> Email
            </a>
          )}

          {/* View profile arrow */}
          <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export function TutorsTab({ tutors, loading, user, onRefresh, ensureProfile }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [filter,   setFilter]   = useState<"all" | "online" | "offline">("all");

  const filtered = tutors.filter(t => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      t.name?.toLowerCase().includes(q) ||
      (t.subjects ?? []).some((s: string) => s.toLowerCase().includes(q)) ||
      t.bio?.toLowerCase().includes(q) ||
      t.location?.toLowerCase().includes(q);
    const matchF = filter === "all" || (filter === "online" ? t.is_online : !t.is_online);
    return matchQ && matchF;
  });

  const onlineCount  = tutors.filter(t => t.is_online).length;
  const offlineCount = tutors.filter(t => !t.is_online).length;

  return (
    <div className="flex flex-col gap-3">

      {/* Search + Register */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tutors or subjects…"
            className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
        </div>
        <button onClick={() => setShowForm(true)}
          className="shrink-0 flex items-center gap-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-3 py-2.5 rounded-xl active:scale-[0.97] transition-all shadow-sm shadow-blue-500/20">
          <Plus className="w-3.5 h-3.5" /> Register
        </button>
      </div>

      {/* Filter pills */}
      {tutors.length > 0 && (
        <div className="flex gap-1.5">
          {([
            { key: "all",     label: `All · ${tutors.length}` },
            { key: "online",  label: `🟢 Online · ${onlineCount}` },
            { key: "offline", label: `⚫ Offline · ${offlineCount}` },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${filter === f.key ? "bg-blue-600 border-blue-600 text-white" : "border-border text-muted-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-52 rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <p className="font-semibold text-sm text-foreground">
            {search ? "No tutors match" : "No tutors yet"}
          </p>
          <p className="text-xs text-muted-foreground">
            {search ? "Try a different search." : "Be the first to register!"}
          </p>
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

      {showForm && (
        <TutorRegisterForm user={user} onSuccess={onRefresh} onClose={() => setShowForm(false)} ensureProfile={ensureProfile} />
      )}
      {selected && (
        <TutorDetailModal t={selected} user={user} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
