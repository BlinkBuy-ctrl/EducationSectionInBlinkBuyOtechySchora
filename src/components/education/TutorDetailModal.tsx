import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, Heart, Phone, Mail, MapPin, BookOpen,
  School, MessageSquare, AlertTriangle, Shield, Check, Circle
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props { t: any; user: any; onClose: () => void; }

export function TutorDetailModal({ t, user, onClose }: Props) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(t.likes_count ?? 0);

  useEffect(() => {
    supabase.from("otechy_tutor_likes")
      .select("id").eq("tutor_id", t.id).eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setLiked(true); });
  }, [t.id, user.id]);

  const toggleLike = async () => {
    if (liked) {
      await supabase.from("otechy_tutor_likes").delete().eq("tutor_id", t.id).eq("user_id", user.id);
      setLikes((p: number) => p - 1); setLiked(false);
    } else {
      await supabase.from("otechy_tutor_likes").insert({ tutor_id: t.id, user_id: user.id });
      setLikes((p: number) => p + 1); setLiked(true);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="w-full max-w-lg bg-card rounded-t-3xl flex flex-col overflow-hidden"
        style={{ height: "90vh", maxHeight: "90vh" }}
        onClick={e => e.stopPropagation()}>

        {/* ── Optional banner strip — only shows if a banner was uploaded, full image, no cropping ── */}
        {t.banner_url && (
          <div className="relative shrink-0 bg-muted/30" style={{ height: 110 }}>
            <img src={t.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-40" />
            <img src={t.banner_url} alt="" className="relative w-full h-full object-contain" />
          </div>
        )}

        {/* ── Compact header ── */}
        <div className="flex items-start gap-3 px-4 pt-4 pb-3 border-b border-border shrink-0">
          {/* Avatar — shows the real uploaded photo in full if present, otherwise a tutor icon */}
          <div className="w-13 h-13 rounded-2xl bg-blue-500/15 overflow-hidden flex items-center justify-center shrink-0" style={{ width: 52, height: 52 }}>
            {t.avatar_url
              ? <img src={t.avatar_url} alt={t.name} className="w-full h-full object-cover" />
              : <School className="w-6 h-6 text-blue-500" />
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="font-black text-base text-foreground leading-tight">{t.name}</h2>
              {t.is_verified && (
                <span className="inline-flex items-center gap-1 shrink-0">
                  <span className="relative w-3.5 h-3.5 flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                    <Check className="w-2 h-2 text-white absolute" strokeWidth={3.5} />
                  </span>
                  <span className="text-[10px] font-bold text-blue-600">Verified</span>
                </span>
              )}
            </div>
            {t.tagline && <p className="text-xs text-muted-foreground leading-tight mt-0.5">{t.tagline}</p>}
            <div className="mt-1.5">
              {t.is_online ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-500">
                  <Circle className="w-1.5 h-1.5 fill-green-500 text-green-500" /> Online now
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  In-person
                </span>
              )}
            </div>
          </div>

          <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 flex flex-col gap-4">

            {/* Scam warning — shown when admin has flagged this tutor */}
            {t.is_scam && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-400">Reported by our team</p>
                  <p className="text-[11px] text-red-400/80 mt-0.5 leading-relaxed">
                    {t.scam_reason || "This tutor profile has been flagged. Proceed with caution and verify details independently before paying anything."}
                  </p>
                </div>
              </div>
            )}

            {/* Stats row */}
            <div className="flex gap-2">
              {[
                { label: (t.subjects ?? []).length, sub: "Subjects" },
                { label: likes,                     sub: "Likes"    },
                ...(t.price_range ? [{ label: t.price_range, sub: "Rate" }] : []),
              ].map(s => (
                <div key={s.sub} className="flex-1 bg-muted/40 rounded-xl py-2.5 px-2 flex flex-col items-center gap-0.5 border border-border/50">
                  <span className="text-sm font-black text-foreground">{s.label}</span>
                  <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">{s.sub}</span>
                </div>
              ))}
            </div>

            {/* Subjects */}
            {(t.subjects ?? []).length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Subjects</p>
                <div className="flex flex-wrap gap-1.5">
                  {(t.subjects ?? []).map((s: string) => (
                    <span key={s}
                      className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-border bg-muted/30 text-foreground">
                      <BookOpen className="w-3 h-3 text-blue-400" /> {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            {t.location && (
              <div className="flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2.5 border border-border/50">
                <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold">Location</p>
                  <p className="text-xs font-bold text-foreground">{t.location}</p>
                </div>
              </div>
            )}

            {/* Bio */}
            {t.bio && (
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">About</p>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{t.bio}</p>
              </div>
            )}

            {/* Like button */}
            <button onClick={toggleLike}
              className={`self-start flex items-center gap-2 px-4 py-2 rounded-xl border transition-all active:scale-95 ${
                liked
                  ? "bg-red-500/15 border-red-500/30 text-red-400"
                  : "bg-muted/30 border-border text-muted-foreground"
              }`}>
              <Heart className={`w-4 h-4 transition-all ${liked ? "fill-red-400 scale-110" : ""}`} />
              <span className="text-xs font-bold">{likes} {likes === 1 ? "like" : "likes"}</span>
            </button>

          </div>
        </div>

        {/* ── Sticky contact footer ── */}
        <div className="px-4 py-3 border-t border-border bg-card shrink-0">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Contact</p>
          <div className="flex gap-2">
            {t.whatsapp && (
              <a href={`https://wa.me/${t.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold text-white active:scale-[0.97] transition-all"
                style={{ background: "linear-gradient(135deg, #25d366, #128c7e)" }}>
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
              </a>
            )}
            {t.contact && (
              <a href={`tel:${t.contact}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold text-white active:scale-[0.97] transition-all"
                style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>
                <Phone className="w-3.5 h-3.5" /> Call
              </a>
            )}
            {t.email && (
              <a href={`mailto:${t.email}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold text-white active:scale-[0.97] transition-all"
                style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}>
                <Mail className="w-3.5 h-3.5" /> Email
              </a>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
