import { useState, useEffect } from "react";
import {
  X, Heart, Phone, Mail, MapPin, BookOpen,
  Wifi, WifiOff, MessageSquare, Star, AlertTriangle, Shield, Check
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props { t: any; user: any; onClose: () => void; }

export function TutorDetailModal({ t, user, onClose }: Props) {
  const [liked,   setLiked]   = useState(false);
  const [likes,   setLikes]   = useState(t.likes_count ?? 0);

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

  const initials = t.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "T";
  const gradients = [
    "from-violet-600 via-purple-600 to-blue-600",
    "from-blue-600 via-cyan-500 to-teal-500",
    "from-rose-500 via-pink-600 to-purple-600",
    "from-amber-500 via-orange-500 to-red-500",
    "from-emerald-500 via-teal-500 to-cyan-600",
  ];
  const grad = gradients[(t.name?.charCodeAt(0) ?? 0) % gradients.length];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="w-full max-w-lg bg-card rounded-t-3xl flex flex-col overflow-hidden"
        style={{ height: "90vh", maxHeight: "90vh" }}
        onClick={e => e.stopPropagation()}>

        {/* ── Hero banner ── */}
        <div className="relative shrink-0" style={{ height: 200 }}>
          {t.banner_url
            ? <img src={t.banner_url} alt="" className="w-full h-full object-cover" />
            : <div className={`w-full h-full bg-gradient-to-br ${grad}`} />
          }
          {/* Dark gradient overlay bottom */}
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55) 100%)" }} />

          {/* Close button */}
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
            <X className="w-3.5 h-3.5 text-white" />
          </button>

          {/* Online badge */}
          <div className="absolute top-4 left-4">
            {t.is_online
              ? <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/25 backdrop-blur-sm border border-green-400/30 text-green-300">
                  <Wifi className="w-2.5 h-2.5" /> Online
                </span>
              : <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 text-white/50">
                  <WifiOff className="w-2.5 h-2.5" /> In-person
                </span>
            }
          </div>

          {/* Name over banner bottom */}
          <div className="absolute bottom-3 left-4 right-16">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h2 className="font-black text-lg text-white leading-tight drop-shadow-md">{t.name}</h2>
              {t.is_verified && (
                <span className="inline-flex items-center gap-1 shrink-0">
                  <span className="relative w-4 h-4 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-blue-500 fill-blue-500" />
                    <Check className="w-2.5 h-2.5 text-white absolute" strokeWidth={3.5} />
                  </span>
                  <span className="text-xs font-bold text-white drop-shadow-md">Verified</span>
                </span>
              )}
            </div>
            {t.tagline && <p className="text-xs text-white/70 leading-tight">{t.tagline}</p>}
          </div>

          {/* Avatar — bottom-left overlapping */}
          <div className="absolute -bottom-7 left-4">
            <div className={`w-14 h-14 rounded-2xl border-[3px] border-card bg-gradient-to-br ${grad} overflow-hidden flex items-center justify-center shadow-xl`}>
              {t.avatar_url
                ? <img src={t.avatar_url} alt={t.name} className="w-full h-full object-cover" />
                : <span className="text-white font-black text-base">{initials}</span>
              }
            </div>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="pt-10 px-4 pb-6 flex flex-col gap-5">

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
    </div>
  );
}
