import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, Award, Calendar, MapPin, BookOpen, Tag,
  Heart, MessageCircle, ExternalLink, Send, Loader2, AlertTriangle, Shield, Check, Maximize2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface Props { s: any; user: any; onClose: () => void; }

export function ScholarshipDetailModal({ s, user, onClose }: Props) {
  const { toast } = useToast();
  const [liked,    setLiked]    = useState(false);
  const [likes,    setLikes]    = useState(s.likes_count ?? 0);
  const [comments, setComments] = useState<any[]>([]);
  const [body,     setBody]     = useState("");
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [fullImage, setFullImage] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [likeRes, commRes] = await Promise.all([
        supabase.from("otechy_scholarship_likes").select("id").eq("scholarship_id", s.id).eq("user_id", user.id).maybeSingle(),
        supabase.from("otechy_scholarship_comments").select("*").eq("scholarship_id", s.id).order("created_at", { ascending: true }),
      ]);
      if (likeRes.data) setLiked(true);
      if (commRes.error) {
        toast({ title: "Couldn't load comments", description: commRes.error.message, variant: "destructive" });
      }
      setComments(commRes.data ?? []);
      setLoading(false);
    };
    load();
  }, [s.id, user.id]);

  const toggleLike = async () => {
    if (liked) {
      await supabase.from("otechy_scholarship_likes").delete().eq("scholarship_id", s.id).eq("user_id", user.id);
      setLikes((p: number) => p - 1); setLiked(false);
    } else {
      await supabase.from("otechy_scholarship_likes").insert({ scholarship_id: s.id, user_id: user.id });
      setLikes((p: number) => p + 1); setLiked(true);
    }
  };

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from("otechy_scholarship_comments").insert({
        scholarship_id: s.id, user_id: user.id, body: body.trim(),
      });
      if (error) throw error;
      setBody("");
      const { data, error: reloadErr } = await supabase.from("otechy_scholarship_comments").select("*").eq("scholarship_id", s.id).order("created_at", { ascending: true });
      if (reloadErr) throw reloadErr;
      setComments(data ?? []);
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center"
      style={{ paddingTop: "max(0px, env(safe-area-inset-top, 0px))" }}>
      <div className="bg-card border border-border rounded-t-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow">
              <Award className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h2 className="font-black text-sm text-foreground leading-tight">{s.title}</h2>
                {s.is_verified && (
                  <span className="inline-flex items-center gap-1 shrink-0">
                    <span className="relative w-3.5 h-3.5 flex items-center justify-center">
                      <Shield className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                      <Check className="w-2 h-2 text-white absolute" strokeWidth={3.5} />
                    </span>
                    <span className="text-[9px] font-bold text-blue-600">Verified</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-yellow-500 font-semibold">{s.provider}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

          {/* Scam warning — shown when admin has flagged this scholarship */}
          {s.is_scam && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-400">Reported by our team</p>
                <p className="text-[11px] text-red-400/80 mt-0.5 leading-relaxed">
                  {s.scam_reason || "This scholarship listing has been flagged. Proceed with caution and verify details independently before sharing any personal or payment information."}
                </p>
              </div>
            </div>
          )}

          {/* Banner — shown in full, tap to view full-screen */}
          <button onClick={() => s.image_url && setFullImage(true)}
            className="relative w-full rounded-2xl overflow-hidden bg-muted/30 active:scale-[0.98] transition-transform flex items-center justify-center"
            style={{ height: 200, minHeight: 200 }}>
            {s.image_url ? (
              <>
                <img
                  src={s.image_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-40"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <img
                  src={s.image_url}
                  alt={s.title}
                  className="relative w-full h-full object-contain"
                  style={{ maxHeight: 200 }}
                  onError={e => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = "none";
                    el.parentElement?.querySelector(".img-fallback")?.classList.remove("hidden");
                  }}
                />
                <div className="img-fallback hidden absolute inset-0 flex items-center justify-center flex-col gap-2">
                  <Award className="w-9 h-9 text-yellow-500/60" />
                  <p className="text-xs text-muted-foreground">Image unavailable</p>
                </div>
                <span className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
                  <Maximize2 className="w-3.5 h-3.5 text-white" />
                </span>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Award className="w-9 h-9 text-yellow-500/60" />
                <p className="text-xs text-muted-foreground">No image uploaded</p>
              </div>
            )}
          </button>

          {/* Amount badge */}
          {s.amount && (
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 rounded-xl self-start">
              <span className="text-xs font-bold text-yellow-400">💰 {s.amount}</span>
            </div>
          )}

          {/* Meta pills */}
          <div className="flex flex-wrap gap-2">
            {s.deadline && (
              <span className="flex items-center gap-1.5 text-xs bg-muted px-3 py-1.5 rounded-full text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" /> Deadline: {new Date(s.deadline).toLocaleDateString("en-MW", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            )}
            {s.study_level && s.study_level !== "Any" && (
              <span className="flex items-center gap-1.5 text-xs bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-full">
                <BookOpen className="w-3.5 h-3.5" /> {s.study_level}
              </span>
            )}
            {s.country && (
              <span className="flex items-center gap-1.5 text-xs bg-muted px-3 py-1.5 rounded-full text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" /> {s.country}
              </span>
            )}
          </div>

          {/* Tags */}
          {(s.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {s.tags.map((tag: string) => (
                <span key={tag} className="flex items-center gap-1 text-xs bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full">
                  <Tag className="w-3 h-3" /> {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {s.description && (
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wide mb-2">About</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{s.description}</p>
            </div>
          )}

          {/* Eligibility */}
          {s.eligibility && (
            <div className="bg-muted/50 border border-border rounded-xl p-3">
              <h3 className="text-xs font-bold text-foreground mb-1">Eligibility</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.eligibility}</p>
            </div>
          )}

          {/* Apply button */}
          {s.link && (
            <a href={s.link} target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-all shadow-lg shadow-yellow-500/20">
              Apply Now <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {/* Like & comment counts */}
          <div className="flex items-center gap-4 py-2 border-t border-border">
            <button onClick={toggleLike}
              className={`flex items-center gap-2 text-sm font-semibold transition-colors ${liked ? "text-red-500" : "text-muted-foreground"}`}>
              <Heart className={`w-5 h-5 ${liked ? "fill-red-500" : ""}`} /> {likes}
            </button>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="w-5 h-5" /> {comments.length}
            </span>
          </div>

          {/* Comments */}
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wide mb-3">Comments</h3>
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
            ) : (
              <div className="flex flex-col gap-2 mb-3">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shrink-0 text-[11px] text-white font-bold">
                      {(c.user_id ?? "????").slice(-2).toUpperCase()}
                    </div>
                    <div className="bg-muted/50 rounded-xl px-3 py-2 flex-1">
                      <p className="text-[11px] font-semibold text-foreground">User {(c.user_id ?? "0000").slice(-4).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comment input */}
            <div className="flex gap-2">
              <input value={body} onChange={e => setBody(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Write a comment…"
                className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
              <button onClick={send} disabled={sending || !body.trim()}
                className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white disabled:opacity-40 active:scale-95 transition-all">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full-screen image viewer */}
      {fullImage && s.image_url && (
        <div className="fixed inset-0 z-[80] bg-black flex items-center justify-center"
          onClick={() => setFullImage(false)}>
          <img src={s.image_url} alt={s.title} className="max-w-full max-h-full object-contain" />
          <button onClick={() => setFullImage(false)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
            style={{ marginTop: "env(safe-area-inset-top, 0px)" }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}
