import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Loader2, School, ExternalLink, Link2, MessageCircle,
  Share2, Camera, Music2, Send, Bus, LogIn, Globe,
} from "lucide-react";
import { getUniversityLinks, type UniversityLink } from "@/lib/universities";
import type { University } from "@/lib/universities";
import { useToast } from "@/hooks/use-toast";

interface Props { university: University; onClose: () => void; }

// Free-text platform_type → icon + brand-ish gradient. Falls back to a
// generic link style for anything the admin types that isn't recognised.
function getLinkStyle(platformType: string) {
  const p = platformType.toLowerCase();
  if (p.includes("whatsapp")) return { icon: MessageCircle, gradient: "linear-gradient(135deg, #25d366, #128c7e)" };
  if (p.includes("facebook")) return { icon: Share2, gradient: "linear-gradient(135deg, #1877f2, #0a58c2)" };
  if (p.includes("instagram")) return { icon: Camera, gradient: "linear-gradient(135deg, #f58529, #dd2a7b, #8134af)" };
  if (p.includes("tiktok")) return { icon: Music2, gradient: "linear-gradient(135deg, #25f4ee, #010101, #fe2c55)" };
  if (p.includes("telegram")) return { icon: Send, gradient: "linear-gradient(135deg, #2aabee, #229ed9)" };
  if (p.includes("transport") || p.includes("bus")) return { icon: Bus, gradient: "linear-gradient(135deg, #f97316, #ea580c)" };
  if (p.includes("portal") || p.includes("login")) return { icon: LogIn, gradient: "linear-gradient(135deg, #6366f1, #4f46e5)" };
  if (p.includes("website") || p.includes("web")) return { icon: Globe, gradient: "linear-gradient(135deg, #3b82f6, #2563eb)" };
  return { icon: Link2, gradient: "linear-gradient(135deg, #7c3aed, #3b82f6)" };
}

function LinkRow({ link }: { link: UniversityLink }) {
  const { icon: Icon, gradient } = getLinkStyle(link.platform_type);
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 active:scale-[0.98] transition-all"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: gradient }}>
        <Icon className="w-4.5 h-4.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate">{link.platform_type}</p>
        {link.description && <p className="text-xs text-muted-foreground truncate">{link.description}</p>}
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
    </a>
  );
}

export function UniversityDetailModal({ university, onClose }: Props) {
  const { toast } = useToast();
  const [links, setLinks] = useState<UniversityLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    getUniversityLinks(university.id)
      .then(setLinks)
      .catch((e: any) => toast({ title: "Failed to load links", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [university.id]);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg bg-card rounded-t-3xl flex flex-col overflow-hidden"
        style={{ height: "85vh", maxHeight: "85vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
            {university.logo_url && !logoFailed ? (
              <img src={university.logo_url} alt={university.name} className="w-full h-full object-cover" onError={() => setLogoFailed(true)} />
            ) : (
              <School className="w-6 h-6 text-purple-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-base text-foreground leading-tight truncate">{university.name}</h2>
            <p className="text-xs text-muted-foreground">Official links & groups</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {loading ? (
            <div className="flex justify-center py-14"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : links.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                <Link2 className="w-7 h-7 text-purple-400" />
              </div>
              <p className="font-semibold text-foreground">No links posted yet</p>
              <p className="text-sm text-muted-foreground">Check back soon for group links.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {links.map(link => <LinkRow key={link.id} link={link} />)}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
