import { useState, useRef } from "react";
import {
  Users, Heart, Phone, Mail, MapPin, BookOpen,
  Plus, X, Upload, Loader2, Search, Wifi, WifiOff,
  MessageSquare, BadgeCheck
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface Props {
  tutors: any[];
  loading: boolean;
  user: any;
  onRefresh: () => void;
  ensureProfile?: () => Promise<void>;
}

// ── Registration Form ──────────────────────────────────────────────
function TutorRegisterForm({ user, onSuccess, onClose, ensureProfile }: { user: any; onSuccess: () => void; onClose: () => void; ensureProfile?: () => Promise<void> }) {
  const { toast } = useToast();
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
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

  const pickImg = (ref: React.RefObject<HTMLInputElement>, cb: (f: File) => void) => {
    ref.current?.click();
    const handler = () => {
      const f = ref.current?.files?.[0];
      if (f) cb(f);
    };
    ref.current?.addEventListener("change", handler, { once: true });
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
      onSuccess();
      onClose();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border flex items-center justify-between px-4 py-3 z-10">
          <h2 className="font-bold text-base text-foreground flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /> Register as Tutor</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {/* Banner */}
          <div className="relative">
            <div onClick={() => pickImg(bannerRef, f => { setBannerFile(f); setBannerPrev(URL.createObjectURL(f)); })}
              className="h-28 rounded-xl border-2 border-dashed border-border hover:border-blue-500/50 cursor-pointer overflow-hidden transition-colors">
              {bannerPrev
                ? <img src={bannerPrev} className="w-full h-full object-cover" />
                : <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground">
                    <Upload className="w-5 h-5" /><span className="text-xs">Banner image (optional)</span>
                  </div>
              }
            </div>
            {/* Avatar overlaid */}
            <div onClick={() => pickImg(avatarRef, f => { setAvatarFile(f); setAvatarPrev(URL.createObjectURL(f)); })}
              className="absolute -bottom-5 left-4 w-14 h-14 rounded-2xl border-4 border-card bg-gradient-to-br from-blue-600 to-purple-600 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
              {avatarPrev
                ? <img src={avatarPrev} className="w-full h-full object-cover" />
                : <div className="flex items-center justify-center h-full"><Upload className="w-5 h-5 text-white" /></div>
              }
            </div>
          </div>
          <div className="h-5" /> {/* spacer for avatar overlap */}

          <input ref={avatarRef} type="file" accept="image/*" className="hidden" />
          <input ref={bannerRef} type="file" accept="image/*" className="hidden" />

          <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full name *"
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          <input value={form.tagline} onChange={e => set("tagline", e.target.value)} placeholder="Tagline (e.g. MSCE Maths Specialist)"
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          <textarea value={form.bio} onChange={e => set("bio", e.target.value)} placeholder="Describe your teaching experience, approach, qualifications… *"
            rows={4} className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" />
          <input value={form.subjects} onChange={e => set("subjects", e.target.value)} placeholder="Subjects (comma-separated, e.g. Maths, Physics, English) *"
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          <input value={form.price_range} onChange={e => set("price_range", e.target.value)} placeholder="Price range (e.g. MK 3,000–5,000/hr)"
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Location (e.g. Lilongwe, Area 49)"
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="WhatsApp number"
              className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            <input value={form.email} onChange={e => set("email", e.target.value)} placeholder="Email"
              className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          <input value={form.contact} onChange={e => set("contact", e.target.value)} placeholder="Primary contact / phone *"
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />

          {/* Online toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div onClick={() => set("is_online", !form.is_online)}
              className={`w-10 h-6 rounded-full transition-colors ${form.is_online ? "bg-blue-600" : "bg-border"} relative`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.is_online ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-foreground">Available online</span>
          </label>

          <button onClick={handleSubmit} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            {saving ? "Posting…" : "Post Tutor Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tutor Card ─────────────────────────────────────────────────────
function TutorCard({ t, user }: { t: any; user: any }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(t.likes_count ?? 0);
  const [expanded, setExpanded] = useState(false);

  const toggleLike = async () => {
    if (liked) {
      await supabase.from("otechy_tutor_likes").delete().eq("tutor_id", t.id).eq("user_id", user.id);
      setLikes((p: number) => p - 1); setLiked(false);
    } else {
      await supabase.from("otechy_tutor_likes").insert({ tutor_id: t.id, user_id: user.id });
      setLikes((p: number) => p + 1); setLiked(true);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200">
      {/* Banner */}
      {t.banner_url
        ? <img src={t.banner_url} alt="" className="w-full h-24 object-cover" />
        : <div className="w-full h-24 bg-gradient-to-br from-blue-600/30 to-purple-600/20" />
      }

      <div className="px-4 pb-4">
        {/* Avatar + name row */}
        <div className="flex items-end gap-3 -mt-6 mb-3">
          <div className="w-14 h-14 rounded-2xl border-4 border-card overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shrink-0 shadow-md">
            {t.avatar_url
              ? <img src={t.avatar_url} alt={t.name} className="w-full h-full object-cover" />
              : <span className="text-white text-xl font-bold">{t.name?.[0]?.toUpperCase() ?? "T"}</span>
            }
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-1">
              <h3 className="font-bold text-sm text-foreground truncate">{t.name}</h3>
              {t.is_online && <BadgeCheck className="w-3.5 h-3.5 text-green-400 shrink-0" />}
            </div>
            {t.tagline && <p className="text-[11px] text-muted-foreground truncate">{t.tagline}</p>}
          </div>
          <div className="pb-1">
            {t.is_online
              ? <span className="flex items-center gap-1 text-[10px] text-green-400 font-semibold"><Wifi className="w-3 h-3" /> Online</span>
              : <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><WifiOff className="w-3 h-3" /> Offline</span>
            }
          </div>
        </div>

        {/* Subjects */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(t.subjects ?? []).map((s: string) => (
            <span key={s} className="flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full">
              <BookOpen className="w-3 h-3" /> {s}
            </span>
          ))}
        </div>

        {/* Bio */}
        <p className={`text-xs text-muted-foreground leading-relaxed mb-3 ${!expanded ? "line-clamp-3" : ""}`}>{t.bio}</p>
        {t.bio?.length > 120 && (
          <button onClick={() => setExpanded(p => !p)} className="text-xs text-blue-400 -mt-2 mb-2 block">
            {expanded ? "Show less" : "Read more"}
          </button>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-2 mb-3">
          {t.location && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="w-3 h-3" /> {t.location}
            </span>
          )}
          {t.price_range && (
            <span className="text-[10px] font-semibold text-green-400">{t.price_range}</span>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <button onClick={toggleLike}
            className={`flex items-center gap-1 text-xs font-semibold transition-colors ${liked ? "text-red-500" : "text-muted-foreground hover:text-red-400"}`}>
            <Heart className={`w-4 h-4 ${liked ? "fill-red-500" : ""}`} /> {likes}
          </button>
          <div className="flex-1" />
          {t.whatsapp && (
            <a href={`https://wa.me/${t.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors">
              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
            </a>
          )}
          {t.contact && (
            <a href={`tel:${t.contact}`}
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors">
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
          )}
          {t.email && (
            <a href={`mailto:${t.email}`}
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors">
              <Mail className="w-3.5 h-3.5" /> Email
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────
export function TutorsTab({ tutors, loading, user, onRefresh, ensureProfile }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = tutors.filter(t => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      t.name?.toLowerCase().includes(q) ||
      (t.subjects ?? []).some((s: string) => s.toLowerCase().includes(q)) ||
      t.bio?.toLowerCase().includes(q) ||
      t.location?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tutors or subjects…"
            className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
        </div>
        <button onClick={() => setShowForm(true)}
          className="shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-3 py-2.5 rounded-xl transition-all active:scale-[0.97] shadow-sm">
          <Plus className="w-3.5 h-3.5" /> Register
        </button>
      </div>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-52 rounded-2xl bg-muted/50 animate-pulse" />)
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <Users className="w-7 h-7 text-blue-400" />
          </div>
          <p className="font-semibold text-foreground">{search ? "No tutors match" : "No tutors yet"}</p>
          <p className="text-sm text-muted-foreground">{search ? "Try a different search." : "Be the first to register!"}</p>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-[0.98] transition-all">
            <Plus className="w-4 h-4" /> Register as Tutor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(t => <TutorCard key={t.id} t={t} user={user} />)}
        </div>
      )}

      {showForm && (
        <TutorRegisterForm user={user} onSuccess={onRefresh} onClose={() => setShowForm(false)} ensureProfile={ensureProfile} />
      )}
    </div>
  );
}