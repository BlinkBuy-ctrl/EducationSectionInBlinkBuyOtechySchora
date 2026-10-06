import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Loader2, School, ExternalLink, Link2, BookOpen,
  FileText, FileSpreadsheet, Presentation, Image as ImageIcon, File as FileIcon,
} from "lucide-react";
import {
  FaWhatsapp, FaFacebook, FaInstagram, FaTiktok, FaTelegram,
  FaBus, FaSignInAlt, FaGlobe, FaLink,
} from "react-icons/fa";
import { getUniversityLinks, type UniversityLink } from "@/lib/universities";
import type { University } from "@/lib/universities";
import type { EducationFile, EducationFileType } from "@/lib/educationFiles";
import { useToast } from "@/hooks/use-toast";

interface Props {
  university: University;
  onClose: () => void;
  // Books/resources uploaded under this university (passed in from UniversitiesTab,
  // which already loads + caches them, so this works offline too).
  files?: EducationFile[];
  filesLoading?: boolean;
  onOpenFile?: (file: EducationFile) => void;
}

const FILE_TYPE_ICON: Record<EducationFileType, typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  image: ImageIcon,
  other: FileIcon,
};

// Free-text platform_type → icon + brand-ish gradient. Falls back to a
// generic link style for anything the admin types that isn't recognised.
function getLinkStyle(platformType: string) {
  const p = (platformType ?? "").toLowerCase();
  if (p.includes("whatsapp")) return { icon: FaWhatsapp, gradient: "linear-gradient(135deg, #25d366, #128c7e)" };
  if (p.includes("facebook")) return { icon: FaFacebook, gradient: "linear-gradient(135deg, #1877f2, #0a58c2)" };
  if (p.includes("instagram")) return { icon: FaInstagram, gradient: "linear-gradient(135deg, #f58529, #dd2a7b, #8134af)" };
  if (p.includes("tiktok")) return { icon: FaTiktok, gradient: "linear-gradient(135deg, #25f4ee, #010101, #fe2c55)" };
  if (p.includes("telegram")) return { icon: FaTelegram, gradient: "linear-gradient(135deg, #2aabee, #229ed9)" };
  if (p.includes("transport") || p.includes("bus")) return { icon: FaBus, gradient: "linear-gradient(135deg, #f97316, #ea580c)" };
  if (p.includes("portal") || p.includes("login")) return { icon: FaSignInAlt, gradient: "linear-gradient(135deg, #0ea5e9, #4f46e5)" };
  if (p.includes("website") || p.includes("web")) return { icon: FaGlobe, gradient: "linear-gradient(135deg, #3b82f6, #2563eb)" };
  return { icon: FaLink, gradient: "linear-gradient(135deg, #0284c7, #3b82f6)" };
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

// Admin-written description: 3 lines, then "Read more / Read less".
// The toggle only appears when the text is actually longer than 3 lines.
function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) return; // keep the toggle visible while expanded
    setCanExpand(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  return (
    <div className="bg-sky-500/5 border border-sky-500/15 rounded-2xl p-3.5">
      <p
        ref={ref}
        className={`text-[15px] leading-relaxed text-foreground whitespace-pre-line break-words ${expanded ? "" : "line-clamp-3"}`}
      >
        {text}
      </p>
      {(canExpand || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-1.5 text-sm font-bold text-sky-500 active:opacity-70"
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}

function SectionTitle({ icon: Icon, label, count }: { icon: typeof Link2; label: string; count?: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-2.5">
      <Icon className="w-4 h-4 text-sky-500" />
      <p className="font-bold text-sm text-foreground">{label}</p>
      {typeof count === "number" && count > 0 && (
        <span className="text-[10px] font-bold text-sky-500 bg-sky-500/10 rounded-full px-1.5 py-0.5">{count}</span>
      )}
    </div>
  );
}

function FileRow({ file, onOpen }: { file: EducationFile; onOpen?: (f: EducationFile) => void }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const Icon = FILE_TYPE_ICON[file.file_type] ?? FileIcon;
  const showCover = !!file.cover_url && !coverFailed;

  return (
    <button
      type="button"
      onClick={() => onOpen?.(file)}
      className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-2.5 text-left active:scale-[0.98] transition-all"
    >
      <div className="w-12 h-14 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-sky-600 to-blue-600 flex items-center justify-center">
        {showCover ? (
          <img
            src={file.cover_url!}
            alt={file.title}
            className="w-full h-full object-cover object-top"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <Icon className="w-5 h-5 text-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug">{file.title}</p>
        <div className="flex items-center gap-1.5 mt-1 min-w-0">
          {file.category && (
            <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 rounded-full px-1.5 py-0.5 shrink-0">
              {file.category}
            </span>
          )}
          {file.program && <span className="text-[11px] text-muted-foreground truncate">{file.program}</span>}
        </div>
      </div>
    </button>
  );
}

export function UniversityDetailModal({ university, onClose, files = [], filesLoading = false, onOpenFile }: Props) {
  const { toast } = useToast();
  const [links, setLinks] = useState<UniversityLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getUniversityLinks(university.id)
      .then(data => { if (!cancelled) setLinks(data ?? []); })
      .catch((e: any) => {
        // Never crash the page — just show the "no links" message.
        if (!cancelled) setLinks([]);
        if (navigator.onLine) {
          toast({ title: "Failed to load links", description: e?.message, variant: "destructive" });
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [university.id]);

  const description = (university.description ?? "").trim();

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
              <School className="w-6 h-6 text-sky-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-base text-foreground leading-tight truncate">{university.name}</h2>
            <p className="text-xs text-muted-foreground">Sector links & resources</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Body: description → links → books/resources */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 flex flex-col gap-5">
          {description && <Description text={description} />}

          {/* Links */}
          <div>
            <SectionTitle icon={Link2} label="Links" count={links.length} />
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : links.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center bg-muted/20 rounded-2xl">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-sky-400" />
                </div>
                <p className="font-semibold text-sm text-foreground">No links available currently</p>
                <p className="text-xs text-muted-foreground px-4">Check back soon for group links.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {links.map(link => <LinkRow key={link.id} link={link} />)}
              </div>
            )}
          </div>

          {/* Books & resources uploaded to this university */}
          <div>
            <SectionTitle icon={BookOpen} label="Books & Resources" count={files.length} />
            {filesLoading && files.length === 0 ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center bg-muted/20 rounded-2xl">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-sky-400" />
                </div>
                <p className="font-semibold text-sm text-foreground">No books or resources yet</p>
                <p className="text-xs text-muted-foreground px-4">Files uploaded for this university will show here.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {files.map(f => <FileRow key={f.id} file={f} onOpen={onOpenFile} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
