import { useState, useRef } from "react";
import {
  Award, Heart, MessageCircle, ExternalLink, ChevronDown,
  ChevronUp, Send, Plus, X, Upload, Loader2, Calendar,
  MapPin, BookOpen, Tag
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface Props {
  scholarships: any[];
  loading: boolean;
  user: any;
  onRefresh: () => void;
}

// ── Post Form ──────────────────────────────────────────────────────
function ScholarshipPostForm({ user, onSuccess, onClose }: { user: any; onSuccess: () => void; onClose: () => void }) {
  const { toast } = useToast();
  const imgRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", provider: "", description: "", link: "",
    amount: "", deadline: "", eligibility: "",
    study_level: "Any", country: "Malawi", tags: "",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImgFile(f);
    setImgPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.provider) { toast({ title: "Title & provider required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      let image_url: string | null = null;
      if (imgFile) {
        const ext = imgFile.name.split(".").pop();
        const path = `scholarships/${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("otechy-images").upload(path, imgFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("otechy-images").getPublicUrl(path);
        image_url = pub.publicUrl;
      }
      const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
      const { error } = await supabase.from("otechy_scholarships").insert({
        title: form.title, provider: form.provider, description: form.description,
        link: form.link || null, amount: form.amount || null,
        deadline: form.deadline || null, eligibility: form.eligibility || null,
        study_level: form.study_level, country: form.country,
        tags, image_url, posted_by: user.id, is_active: true,
      });
      if (error) throw error;
      toast({ title: "🏆 Scholarship posted!" });
      onSuccess();
      onClose();
    } catch (e: any) {
      toast({ title: "Failed to post", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border flex items-center justify-between px-4 py-3 z-10">
          <h2 className="font-bold text-base text-foreground flex items-center gap-2"><Award className="w-4 h-4 text-yellow-500" /> Post Scholarship</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {/* Image upload */}
          <div
            onClick={() => imgRef.current?.click()}
            className="relative h-36 rounded-xl border-2 border-dashed border-border hover:border-yellow-500/50 cursor-pointer overflow-hidden transition-colors"
          >
            {imgPreview
              ? <img src={imgPreview} alt="" className="w-full h-full object-cover" />
              : <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  <Upload className="w-6 h-6" />
                  <span className="text-xs">Upload banner image (optional)</span>
                </div>
            }
            <input ref={imgRef} type="file" accept="image/*" onChange={handleImg} className="hidden" />
          </div>

          <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Scholarship title *"
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50" />
          <input value={form.provider} onChange={e => set("provider", e.target.value)} placeholder="Provider / Organisation *"
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50" />
          <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Full description, requirements, how to apply…"
            rows={4} className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="Amount (e.g. MK 500,000)"
              className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50" />
            <input value={form.deadline} onChange={e => set("deadline", e.target.value)} type="date"
              className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50" />
          </div>
          <input value={form.eligibility} onChange={e => set("eligibility", e.target.value)} placeholder="Eligibility (e.g. Malawian citizens, age 18-25)"
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.study_level} onChange={e => set("study_level", e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50">
              {["Any","Undergraduate","Postgraduate","PhD","Diploma","Certificate"].map(l => <option key={l}>{l}</option>)}
            </select>
            <input value={form.country} onChange={e => set("country", e.target.value)} placeholder="Country"
              className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50" />
          </div>
          <input value={form.link} onChange={e => set("link", e.target.value)} placeholder="Application link (URL)"
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50" />
          <input value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="Tags (comma-separated, e.g. STEM, Women, Africa)"
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50" />

          <button onClick={handleSubmit} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
            {saving ? "Posting…" : "Post Scholarship"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Comment Section ────────────────────────────────────────────────
function CommentSection({ scholarshipId, user }: { scholarshipId: string; user: any }) {
  const { toast } = useToast();
  const [comments, setComments] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("otechy_scholarship_comments")
      .select("*, profiles(name, avatar_url)")
      .eq("scholarship_id", scholarshipId)
      .order("created_at", { ascending: true });
    setComments(data ?? []);
    setLoaded(true);
  };

  const send = async () => {
    if (!body.trim() || !user) return;
    setSending(true);
    try {
      const { error } = await supabase.from("otechy_scholarship_comments").insert({
        scholarship_id: scholarshipId, user_id: user.id, body: body.trim(),
      });
      if (error) throw error;
      setBody("");
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (!loaded) return (
    <button onClick={load} className="text-xs text-purple-400 hover:text-purple-300 font-medium">
      Load comments
    </button>
  );

  return (
    <div className="mt-3 flex flex-col gap-2">
      {comments.map(c => (
        <div key={c.id} className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shrink-0 text-[10px] text-white font-bold">
            {c.profiles?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="bg-muted/50 rounded-xl px-3 py-1.5 flex-1">
            <span className="text-[11px] font-semibold text-foreground">{c.profiles?.name ?? "User"} </span>
            <span className="text-xs text-muted-foreground">{c.body}</span>
          </div>
        </div>
      ))}
      {user && (
        <div className="flex gap-2 mt-1">
          <input value={body} onChange={e => setBody(e.target.value)} placeholder="Write a comment…" onKeyDown={e => e.key === "Enter" && send()}
            className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          <button onClick={send} disabled={sending || !body.trim()}
            className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl disabled:opacity-40 transition-colors">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Scholarship Card ───────────────────────────────────────────────
function ScholarshipCard({ s, user }: { s: any; user: any }) {
  const { toast } = useToast();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(s.likes_count ?? 0);
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const toggleLike = async () => {
    if (!user) { toast({ title: "Sign in to like", variant: "destructive" }); return; }
    if (liked) {
      await supabase.from("otechy_scholarship_likes").delete().eq("scholarship_id", s.id).eq("user_id", user.id);
      setLikes((p: number) => p - 1); setLiked(false);
    } else {
      await supabase.from("otechy_scholarship_likes").insert({ scholarship_id: s.id, user_id: user.id });
      setLikes((p: number) => p + 1); setLiked(true);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-yellow-500/10 transition-all duration-200">
      {/* Banner image */}
      {s.image_url && (
        <img src={s.image_url} alt={s.title} className="w-full h-40 object-cover" />
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-foreground leading-snug">{s.title}</h3>
            <p className="text-xs text-yellow-500 font-semibold">{s.provider}</p>
            {s.profiles?.name && <p className="text-[10px] text-muted-foreground mt-0.5">Posted by {s.profiles.name}</p>}
          </div>
          {s.amount && (
            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
              {s.amount}
            </span>
          )}
        </div>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {s.deadline && (
            <span className="flex items-center gap-1 text-[10px] bg-muted px-2 py-1 rounded-full text-muted-foreground">
              <Calendar className="w-3 h-3" /> {new Date(s.deadline).toLocaleDateString("en-MW", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
          {s.study_level && s.study_level !== "Any" && (
            <span className="flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full">
              <BookOpen className="w-3 h-3" /> {s.study_level}
            </span>
          )}
          {s.country && (
            <span className="flex items-center gap-1 text-[10px] bg-muted px-2 py-1 rounded-full text-muted-foreground">
              <MapPin className="w-3 h-3" /> {s.country}
            </span>
          )}
          {(s.tags ?? []).slice(0, 3).map((tag: string) => (
            <span key={tag} className="flex items-center gap-1 text-[10px] bg-purple-500/10 text-purple-400 px-2 py-1 rounded-full">
              <Tag className="w-3 h-3" /> {tag}
            </span>
          ))}
        </div>

        {/* Description */}
        {s.description && (
          <div className="mb-3">
            <p className={`text-xs text-muted-foreground leading-relaxed ${!expanded ? "line-clamp-3" : ""}`}>{s.description}</p>
            {s.description.length > 120 && (
              <button onClick={() => setExpanded(p => !p)} className="text-xs text-purple-400 mt-1 flex items-center gap-0.5">
                {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
              </button>
            )}
          </div>
        )}

        {/* Eligibility */}
        {s.eligibility && (
          <div className="bg-muted/50 rounded-xl px-3 py-2 mb-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Eligibility: </span>{s.eligibility}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-3 pt-2 border-t border-border/50">
          <button onClick={toggleLike}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${liked ? "text-red-500" : "text-muted-foreground hover:text-red-400"}`}>
            <Heart className={`w-4 h-4 ${liked ? "fill-red-500" : ""}`} /> {likes}
          </button>
          <button onClick={() => setShowComments(p => !p)}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <MessageCircle className="w-4 h-4" /> {s.comments_count ?? 0}
          </button>
          <div className="flex-1" />
          {s.link && (
            <a href={s.link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-bold text-yellow-500 hover:text-yellow-400 transition-colors">
              Apply <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Comments */}
        {showComments && <CommentSection scholarshipId={s.id} user={user} />}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────
export function ScholarshipsTab({ scholarships, loading, user, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{scholarships.length} scholarship{scholarships.length !== 1 ? "s" : ""}</p>
        {user && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-[0.97] shadow-sm shadow-yellow-500/30">
            <Plus className="w-3.5 h-3.5" /> Post Scholarship
          </button>
        )}
      </div>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 rounded-2xl bg-muted/50 animate-pulse" />)
      ) : scholarships.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
            <Award className="w-7 h-7 text-yellow-500" />
          </div>
          <p className="font-semibold text-foreground">No scholarships yet</p>
          <p className="text-sm text-muted-foreground">Be the first to post one!</p>
          {user && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-[0.98] transition-all">
              <Plus className="w-4 h-4" /> Post Scholarship
            </button>
          )}
        </div>
      ) : (
        scholarships.map(s => <ScholarshipCard key={s.id} s={s} user={user} />)
      )}

      {showForm && user && (
        <ScholarshipPostForm user={user} onSuccess={onRefresh} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
