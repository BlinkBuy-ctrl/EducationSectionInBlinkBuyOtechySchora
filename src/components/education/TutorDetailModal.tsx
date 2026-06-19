import { useState, useEffect } from "react";
import {
  X, Users, Heart, Phone, Mail, MapPin, BookOpen,
  Wifi, WifiOff, BadgeCheck, MessageSquare, Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props { t: any; user: any; onClose: () => void; }

export function TutorDetailModal({ t, user, onClose }: Props) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(t.likes_count ?? 0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("otechy_tutor_likes")
        .select("id").eq("tutor_id", t.id).eq("user_id", user.id).maybeSingle();
      if (data) setLiked(true);
      setLoading(false);
    };
    load();
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

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center">
      <div className="bg-card border border-border rounded-t-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Close */}
        <div className="flex justify-end px-4 pb-1">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable */}
        <div className="flex-1 overflow-y-auto">

          {/* Banner */}
          {t.banner_url
            ? <img src={t.banner_url} alt="" className="w-full h-36 object-cover" />
            : <div className="w-full h-36 bg-gradient-to-br from-blue-600/40 to-purple-600/30" />
          }

          <div className="px-4 pb-8">
            {/* Avatar + name */}
            <div className="flex items-end gap-3 -mt-8 mb-4">
              <div className="w-16 h-16 rounded-2xl border-4 border-card overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shrink-0">
                {t.avatar_url
                  ? <img src={t.avatar_url} alt={t.name} className="w-full h-full object-cover" />
                  : <span className="text-white text-2xl font-black">{t.name?.[0]?.toUpperCase() ?? "T"}</span>
                }
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="font-black text-base text-foreground">{t.name}</h2>
                  {t.is_online && <BadgeCheck className="w-4 h-4 text-green-400" />}
                  {t.is_online
                    ? <span className="text-[10px] text-green-400 font-semibold flex items-center gap-1"><Wifi className="w-3 h-3" /> Online</span>
                    : <span className="text-[10px] text-muted-foreground flex items-center gap-1"><WifiOff className="w-3 h-3" /> In-person</span>
                  }
                </div>
                {t.tagline && <p className="text-xs text-muted-foreground mt-0.5">{t.tagline}</p>}
              </div>
            </div>

            {/* Subjects */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(t.subjects ?? []).map((s: string) => (
                <span key={s} className="flex items-center gap-1 text-xs bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-full">
                  <BookOpen className="w-3 h-3" /> {s}
                </span>
              ))}
            </div>

            {/* Price + Location */}
            <div className="flex flex-wrap gap-3 mb-4">
              {t.price_range && (
                <div className="bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-xl">
                  <p className="text-[10px] text-muted-foreground">Rate</p>
                  <p className="text-sm font-bold text-green-400">{t.price_range}</p>
                </div>
              )}
              {t.location && (
                <div className="bg-muted/50 border border-border px-3 py-2 rounded-xl">
                  <p className="text-[10px] text-muted-foreground">Location</p>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {t.location}</p>
                </div>
              )}
            </div>

            {/* Bio */}
            {t.bio && (
              <div className="mb-4">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wide mb-2">About</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{t.bio}</p>
              </div>
            )}

            {/* Like */}
            <div className="flex items-center gap-2 py-3 border-t border-border mb-4">
              <button onClick={toggleLike}
                className={`flex items-center gap-2 text-sm font-semibold transition-colors ${liked ? "text-red-500" : "text-muted-foreground"}`}>
                <Heart className={`w-5 h-5 ${liked ? "fill-red-500" : ""}`} /> {likes} {likes === 1 ? "like" : "likes"}
              </button>
            </div>

            {/* Contact actions */}
            <div className="flex flex-col gap-2">
              {t.whatsapp && (
                <a href={`https://wa.me/${t.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 font-bold py-3 rounded-2xl active:scale-95 transition-all">
                  <MessageSquare className="w-4 h-4" /> Chat on WhatsApp
                </a>
              )}
              {t.contact && (
                <a href={`tel:${t.contact}`}
                  className="w-full flex items-center justify-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold py-3 rounded-2xl active:scale-95 transition-all">
                  <Phone className="w-4 h-4" /> Call {t.contact}
                </a>
              )}
              {t.email && (
                <a href={`mailto:${t.email}`}
                  className="w-full flex items-center justify-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold py-3 rounded-2xl active:scale-95 transition-all">
                  <Mail className="w-4 h-4" /> Email {t.email}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
