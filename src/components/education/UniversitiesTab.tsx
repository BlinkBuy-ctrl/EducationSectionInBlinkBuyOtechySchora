import { useEffect, useMemo, useState, useContext, useRef, useCallback } from "react";
import {
  Link2, Loader2, Upload, FileText, FileSpreadsheet,
  Presentation, Image as ImageIcon, File as FileIcon, X, Trash2,
  Eye, ChevronLeft, ChevronRight, Download,
} from "lucide-react";
import { getUniversities, type University } from "@/lib/universities";
import {
  getEducationFiles,
  uploadEducationFile,
  deleteEducationFile,
  detectFileType,
  extractPdfCoverBlob,
  EDUCATION_FILE_CATEGORIES,
  ACCEPTED_FILE_EXTENSIONS,
  type EducationFile,
  type EducationFileType,
} from "@/lib/educationFiles";
import { UniversityCarousel } from "@/components/education/UniversityCarousel";
import { EducationFileDetailModal } from "@/components/education/EducationFileDetailModal";
import { AnimatedSearchInput } from "@/components/education/AnimatedSearchInput";
import { UniversityDetailModal } from "@/components/education/UniversityDetailModal";
import { FetchingState } from "@/components/education/FetchingState";
import { useToast } from "@/hooks/use-toast";
import { AuthContext } from "@/hooks/useAuth";
import { getCache, setCache } from "@/lib/offlineCache";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const UNI_SEARCH_PHRASES = [
  "Search LUANAR…",
  "Search Chanco…",
  "Search Kuhes…",
  "Search Mzuni…",
  "Search your university…",
];

const FILE_TYPE_ICON: Record<EducationFileType, typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  image: ImageIcon,
  other: FileIcon,
};

// ── Shared PDF.js singleton (same pattern as ResourceCard/ResourceDetailModal) ──
let pdfjsLib: any = null;
async function getPdf() {
  if (pdfjsLib) return pdfjsLib;
  const lib = await import("pdfjs-dist");
  lib.GlobalWorkerOptions.workerSrc = workerUrl;
  pdfjsLib = lib;
  return lib;
}

const docCache = new Map<string, any>();
async function getDoc(url: string) {
  if (docCache.has(url)) return docCache.get(url);
  const lib = await getPdf();
  const doc = await lib.getDocument({ url, withCredentials: false }).promise;
  docCache.set(url, doc);
  return doc;
}

export async function renderPage(doc: any, pageNum: number, canvas: HTMLCanvasElement) {
  const page = await doc.getPage(pageNum);
  const w = canvas.parentElement?.clientWidth || window.innerWidth;
  const vp = page.getViewport({ scale: 1 });
  const scale = w / vp.width;
  const scaled = page.getViewport({ scale });
  canvas.width = scaled.width;
  canvas.height = scaled.height;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: scaled }).promise;
}

// ── Full-screen PDF reader — same visual language as ResourceCard's reader ──
export function FileReaderModal({ file, onClose }: { file: EducationFile; onClose: () => void }) {
  const [doc, setDoc] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rendering, setRendering] = useState(true);
  const [initLoad, setInitLoad] = useState(true);
  const [error, setError] = useState(false);
  const [showNav, setShowNav] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderingRef = useRef(false);
  const navTimerRef = useRef<any>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const resetNavTimer = useCallback(() => {
    setShowNav(true);
    clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => setShowNav(false), 3500);
  }, []);

  useEffect(() => {
    resetNavTimer();
    return () => clearTimeout(navTimerRef.current);
  }, []);

  useEffect(() => {
    getDoc(file.file_url)
      .then(d => { setDoc(d); setTotal(d.numPages); })
      .catch(() => { setError(true); setRendering(false); setInitLoad(false); });
  }, [file.file_url]);

  useEffect(() => {
    if (!doc || !canvasRef.current) return;
    if (renderingRef.current) return;
    renderingRef.current = true;
    setRendering(true);
    renderPage(doc, page, canvasRef.current)
      .catch(() => setError(true))
      .finally(() => { setRendering(false); setInitLoad(false); renderingRef.current = false; });
  }, [doc, page]);

  const goTo = (p: number) => {
    if (!total || p < 1 || p > total || renderingRef.current) return;
    setPage(p); resetNavTimer();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < 45) return;
    if (dx < 0) goTo(page + 1); else goTo(page - 1);
  };
  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const x = e.clientX; const w = window.innerWidth;
    resetNavTimer();
    if (x < w * 0.33) goTo(page - 1);
    else if (x > w * 0.67) goTo(page + 1);
    else { setShowNav(v => !v); clearTimeout(navTimerRef.current); }
  };

  const progress = total ? (page / total) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col select-none"
      style={{ background: "linear-gradient(160deg,#0d0d1a 0%,#111128 60%,#0a0a14 100%)", touchAction: "pan-y" }}>

      <div className={`absolute top-0 left-0 right-0 z-20 transition-all duration-300 ${showNav ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="flex items-center gap-2.5 px-3 pt-10 pb-5"
          style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.85) 0%,transparent 100%)" }}>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/12 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition-transform shrink-0">
            <X className="w-3.5 h-3.5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs text-white/90 truncate">{file.title}</p>
            <p className="text-[9px] text-white/35">{file.category}</p>
          </div>
          {total > 0 && (
            <div className="shrink-0 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1">
              <span className="text-[10px] text-white/70 font-mono">{page}<span className="text-white/30">/{total}</span></span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onClick={onTap}>
        {initLoad && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <FileText className="w-7 h-7 text-sky-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-sky-600 flex items-center justify-center">
                <Loader2 className="w-3 h-3 animate-spin text-white" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-white/60 font-medium">Opening document</p>
              <p className="text-[10px] text-white/25 mt-1">{file.title}</p>
            </div>
          </div>
        )}
        {rendering && !initLoad && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
              <span className="text-xs text-white/60">Page {page}</span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <FileText className="w-7 h-7 text-red-400/60" />
            </div>
            <p className="text-sm text-white/50 font-medium text-center">Could not load document</p>
            <button onClick={onClose} className="px-5 py-2 rounded-xl bg-white/10 border border-white/10 text-white/70 text-xs font-semibold">Go Back</button>
          </div>
        )}
        {showNav && doc && !rendering && !initLoad && (
          <>
            {page > 1 && (
              <div className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-start pl-2 pointer-events-none">
                <div className="w-7 h-14 rounded-r-xl bg-white/5 border-r border-y border-white/8 flex items-center justify-center">
                  <ChevronLeft className="w-4 h-4 text-white/30" />
                </div>
              </div>
            )}
            {page < total && (
              <div className="absolute right-0 top-0 bottom-0 w-14 flex items-center justify-end pr-2 pointer-events-none">
                <div className="w-7 h-14 rounded-l-xl bg-white/5 border-l border-y border-white/8 flex items-center justify-center">
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>
              </div>
            )}
          </>
        )}
        <div className="w-full h-full overflow-y-auto">
          <div className="px-1 py-2">
            <div className="rounded-xl overflow-hidden shadow-2xl"
              style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.04)", opacity: initLoad ? 0 : rendering ? 0.4 : 1, transition: "opacity 0.2s ease" }}>
              <canvas ref={canvasRef} className="w-full block bg-white" />
            </div>
          </div>
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ${showNav ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
        <div className="px-4 pt-6 pb-8" style={{ background: "linear-gradient(to top,rgba(0,0,0,0.90) 0%,transparent 100%)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[9px] text-white/30 font-mono w-4 text-right shrink-0">1</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: "linear-gradient(to right,#0284c7,#3b82f6)" }} />
            </div>
            <span className="text-[9px] text-white/30 font-mono shrink-0">{total}</span>
          </div>
          {total > 0 && total <= 10 ? (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: total }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={e => { e.stopPropagation(); goTo(p); }}
                  className={`rounded-full transition-all duration-200 active:scale-90 ${p === page ? "w-5 h-2.5 bg-sky-400 shadow-sm shadow-sky-500/50" : "w-2 h-2 bg-white/20"}`} />
              ))}
            </div>
          ) : total > 10 ? (
            <div className="flex items-center justify-between">
              <button onClick={e => { e.stopPropagation(); goTo(page - 1); }} disabled={page <= 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-white/70 text-xs font-semibold disabled:opacity-25 active:scale-95 transition-all">
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <div className="flex flex-col items-center">
                <span className="text-white font-bold text-sm">{page}</span>
                <span className="text-white/30 text-[9px]">of {total}</span>
              </div>
              <button onClick={e => { e.stopPropagation(); goTo(page + 1); }} disabled={page >= total}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold disabled:opacity-25 active:scale-95 transition-all shadow-md"
                style={{ background: "linear-gradient(135deg,#0284c7,#3b82f6)" }}>
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── File card — ResourceCard-style: cover, badges, Read button, tap opens detail modal ──
function EducationFileCard({
  file, universityName, currentUserId, onOpen, onDownload, onDelete,
}: {
  file: EducationFile;
  universityName: string;
  currentUserId: string | null;
  onOpen: (file: EducationFile) => void;
  onDownload: (file: EducationFile) => void;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const Icon = FILE_TYPE_ICON[file.file_type] ?? FileIcon;
  const showCover = !!(file as any).cover_url && !coverFailed;
  const isPdf = file.file_type === "pdf";

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      await onDownload(file);
    } finally {
      setDownloading(false);
    }
  };

  // NOTE: gating delete to the uploader requires an `uploader_id` (auth user id)
  // column on education_files, set at upload time. Until that column exists this
  // reads as undefined and the delete button simply won't show for anyone.
  const isOwner = !!currentUserId && !!(file as any).uploader_id && (file as any).uploader_id === currentUserId;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm(`Remove "${file.title}"?`)) return;
    setDeleting(true);
    try {
      await deleteEducationFile(file.id);
      onDelete(file.id);
    } catch (err: any) {
      alert(err.message ?? "Failed to delete");
      setDeleting(false);
    }
  };

  return (
    <>
      <div
        onClick={() => onOpen(file)}
        className="group relative flex flex-col bg-card border border-border rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-150 cursor-pointer"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      >
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/4", maxHeight: 200 }}>
          {showCover ? (
            <img
              src={(file as any).cover_url}
              alt={file.title}
              className="w-full h-full object-cover object-top"
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-sky-600 to-blue-600 flex flex-col items-center justify-center gap-3 p-4">
              <div className="w-14 h-16 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
                <Icon className="w-7 h-7 text-white" />
              </div>
              <p className="text-white/80 text-[10px] font-semibold text-center leading-tight line-clamp-3 px-1">
                {file.title}
              </p>
            </div>
          )}

          <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm bg-white/90 dark:bg-black/60 text-sky-600 dark:text-sky-400">
              {file.category}
            </span>
            {isOwner && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                aria-label="Delete file"
                className="bg-black/50 backdrop-blur rounded-full p-1.5 text-white/85 active:scale-90 transition-transform shrink-0"
              >
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </button>
            )}
          </div>

          {isPdf && (
            <button
              onClick={e => { e.stopPropagation(); setShowReader(true); }}
              className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full text-white active:scale-90 transition-transform shadow-md"
              style={{ background: "linear-gradient(135deg,#0284c7,#3b82f6)" }}
            >
              <Eye className="w-3 h-3" /> Read
            </button>
          )}

          <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
            style={{ background: "linear-gradient(to top,rgba(0,0,0,0.3) 0%,transparent 100%)" }} />
        </div>

        <div className="p-2.5 flex flex-col gap-1.5">
          <h3 className="font-bold text-xs text-foreground line-clamp-2 leading-snug">{file.title}</h3>
          <p className="text-[10px] text-sky-500 font-semibold truncate">{universityName}</p>
          <p className="text-[10px] text-muted-foreground truncate">{file.program}</p>

          <button
            onClick={handleDownloadClick}
            disabled={downloading}
            className="mt-1 w-full flex items-center justify-center gap-1 bg-gradient-to-r from-sky-600 to-blue-600 text-white text-[10px] font-bold py-2 rounded-lg active:scale-[0.98] transition-all shadow-sm shadow-sky-500/20 disabled:opacity-70"
          >
            {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            {downloading ? "Downloading…" : "Download"}
          </button>
        </div>
      </div>

      {showReader && <FileReaderModal file={file} onClose={() => setShowReader(false)} />}
    </>
  );
}

function UploadFileModal({
  universities,
  onClose,
  onUploaded,
}: {
  universities: University[];
  onClose: () => void;
  onUploaded: (file: EducationFile) => void;
}) {
  const { toast } = useToast();
  const [universityId, setUniversityId] = useState("");
  const [program, setProgram] = useState("");
  const [category, setCategory] = useState<string>(EDUCATION_FILE_CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [uploadedBy, setUploadedBy] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [extractingCover, setExtractingCover] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = universityId && program.trim() && category && title.trim() && file && !submitting && !extractingCover;

  const handleFileChange = async (f: File | null) => {
    setFile(f);
    setCoverBlob(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
    if (!f) return;

    // Only PDFs get a real extracted cover right now (page 1 rendered to an
    // image) — same technique as the paid Resources upload, so "book" covers
    // actually show up here too, live, before the file is even submitted.
    if (detectFileType(f.name) === "pdf") {
      setExtractingCover(true);
      const blob = await extractPdfCoverBlob(f);
      if (blob) {
        setCoverBlob(blob);
        setCoverPreview(URL.createObjectURL(blob));
      }
      setExtractingCover(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !file) return;
    setSubmitting(true);
    try {
      const uploaded = await uploadEducationFile({
        file,
        university_id: universityId,
        program: program.trim(),
        category,
        title: title.trim(),
        uploaded_by: uploadedBy.trim() || undefined,
        // Only PDFs get a pre-extracted cover here (from the live preview);
        // for other types, leave this out so uploadEducationFile() still runs
        // its own extraction (embedded image for docx/xlsx/pptx, or the image
        // file itself).
        ...(detectFileType(file.name) === "pdf" ? { coverBlob } : {}),
      });
      toast({ title: "File uploaded", description: title });
      onUploaded(uploaded);
      onClose();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base text-foreground">Upload a File</h3>
          <button onClick={onClose} className="p-1 active:scale-90 transition-transform">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">University</label>
            <select
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              className="w-full mt-1 bg-card border border-border rounded-xl p-2.5 text-sm text-foreground"
            >
              <option value="">Select university…</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Program / Course</label>
            <input
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              placeholder="e.g. BSc Natural Resources Management"
              className="w-full mt-1 bg-card border border-border rounded-xl p-2.5 text-sm text-foreground"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1 bg-card border border-border rounded-xl p-2.5 text-sm text-foreground"
            >
              {EDUCATION_FILE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. BIO311 Past Paper 2024"
              className="w-full mt-1 bg-card border border-border rounded-xl p-2.5 text-sm text-foreground"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Your name (optional)</label>
            <input
              value={uploadedBy}
              onChange={(e) => setUploadedBy(e.target.value)}
              placeholder="Shown as the uploader"
              className="w-full mt-1 bg-card border border-border rounded-xl p-2.5 text-sm text-foreground"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">File</label>
            <input
              type="file"
              accept={ACCEPTED_FILE_EXTENSIONS}
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              className="w-full mt-1 bg-card border border-border rounded-xl p-2.5 text-sm text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-sky-500 file:text-white file:text-xs file:font-bold"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              PDF, Word, Excel, PowerPoint, CSV or images. Max 50MB.
              {file && (detectFileType(file.name) === "pdf" || ["docx", "xlsx", "pptx"].includes(file.name.split(".").pop()?.toLowerCase() ?? "") || detectFileType(file.name) === "image") &&
                " A cover will be generated automatically."}
            </p>

            {/* Live cover preview — same feedback as the paid Resources upload,
                so it's obvious a cover was (or wasn't) picked up before submitting. */}
            {extractingCover && (
              <div className="mt-2 flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2.5">
                <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                <span className="text-xs text-muted-foreground">Reading cover from page 1…</span>
              </div>
            )}
            {!extractingCover && coverPreview && (
              <div className="relative mt-2 rounded-xl overflow-hidden border border-border">
                <img src={coverPreview} alt="File cover" className="w-full max-h-56 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-2 right-2 bg-sky-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> Cover extracted
                </div>
              </div>
            )}
            {!extractingCover && file && !coverPreview && detectFileType(file.name) === "pdf" && (
              <p className="mt-1.5 text-[10px] text-amber-500">Couldn't read a cover from this PDF — it'll show a plain icon instead.</p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="mt-2 flex items-center justify-center gap-2 bg-sky-500 disabled:opacity-40 text-white font-bold text-sm rounded-xl py-3 active:scale-[0.98] transition-all"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {submitting ? "Uploading…" : "Upload File"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function UniversitiesTab() {
  const { toast } = useToast();
  const { user } = useContext(AuthContext);
  const currentUserId = user?.id ?? null;

  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<University | null>(null);

  const [files, setFiles] = useState<EducationFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [fileFilterUniId, setFileFilterUniId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<EducationFile | null>(null);

  const handleDownloadFile = async (file: EducationFile) => {
    try {
      const res = await fetch(file.file_url);
      if (!res.ok) throw new Error("Could not reach the file");
      const blob = await res.blob();
      const ext = file.file_url.split(".").pop()?.split("?")[0] || "";
      const filename = `${file.title}${ext ? `.${ext}` : ""}`;
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: filename });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast({ title: "✅ Download started!" });
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    }
  };

  const load = async () => {
    const cached = await getCache<University>("universities");
    if (cached.length) {
      setUniversities(cached);
      setLoading(false);
    }

    try {
      const fresh = await getUniversities();
      setUniversities(fresh);
      setCache("universities", fresh);
    } catch (e: any) {
      if (navigator.onLine) {
        toast({ title: "Failed to load universities", description: e.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async () => {
    const cached = await getCache<EducationFile>("education_files");
    if (cached.length) {
      setFiles(cached);
      setFilesLoading(false);
    }

    try {
      const fresh = await getEducationFiles();
      setFiles(fresh);
      setCache("education_files", fresh);
    } catch (e: any) {
      if (navigator.onLine) {
        toast({ title: "Failed to load files", description: e.message, variant: "destructive" });
      }
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => { load(); loadFiles(); }, []);

  useEffect(() => {
    const handler = () => { load(); loadFiles(); };
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = universities.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
  const suggestionPool = useMemo(() => universities.map(u => u.name), [universities]);

  const universityNameById = useMemo(() => {
    const map = new Map<string, string>();
    universities.forEach(u => map.set(u.id, u.name));
    return map;
  }, [universities]);

  const filteredFiles = fileFilterUniId ? files.filter(f => f.university_id === fileFilterUniId) : files;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{universities.length} universit{universities.length !== 1 ? "ies" : "y"}</p>
      </div>

      <AnimatedSearchInput
        value={search}
        onChange={setSearch}
        phrases={UNI_SEARCH_PHRASES}
        ringColorClass="focus:ring-sky-500/50"
        ariaLabel="Search universities"
        suggestionPool={suggestionPool}
      />

      {/* ── Quick browse (compact, auto-scrolling, bigger cards) ── */}
      {loading && universities.length === 0 ? (
        <FetchingState
          icon={Link2}
          label="Fetching universities"
          accentBg="bg-sky-500/10"
          accentText="text-sky-400"
          ringColor="border-t-sky-500"
          compact
        />
      ) : universities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Our team is adding universities soon — check back!</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No universities match "{search}".</p>
      ) : (
        <UniversityCarousel universities={filtered} onOpen={setSelected} title="Reliable University Links" />
      )}

      {/* ── Files Library ───────────────────────────────────── */}
      <div className="flex items-center justify-between mt-2">
        <p className="flex items-center gap-1.5 font-bold text-sm text-foreground">
          <FileText className="w-4 h-4 text-sky-500" /> Files Library
        </p>
        <button
          onClick={() => setShowUpload(true)}
          disabled={universities.length === 0}
          className="flex items-center gap-1 text-xs font-bold text-sky-500 disabled:opacity-40 active:scale-95 transition-transform"
        >
          <Upload className="w-3.5 h-3.5" /> Upload File
        </button>
      </div>

      {universities.length > 0 && (
        <select
          value={fileFilterUniId}
          onChange={(e) => setFileFilterUniId(e.target.value)}
          className="bg-card border border-border rounded-xl p-2 text-xs text-foreground -mt-2"
        >
          <option value="">All universities</option>
          {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      )}

      {filesLoading && files.length === 0 ? (
        <FetchingState
          icon={FileText}
          label="Fetching files"
          accentBg="bg-sky-500/10"
          accentText="text-sky-400"
          ringColor="border-t-sky-500"
          skeletonCount={4}
          skeletonHeight="h-36"
        />
      ) : filteredFiles.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-sky-400" />
          </div>
          <p className="text-sm text-muted-foreground">No files uploaded yet — be the first!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredFiles.map(f => (
            <EducationFileCard
              key={f.id}
              file={f}
              universityName={universityNameById.get(f.university_id) ?? "Unknown university"}
              currentUserId={currentUserId}
              onOpen={setSelectedFile}
              onDownload={handleDownloadFile}
              onDelete={(id) => setFiles(prev => prev.filter(x => x.id !== id))}
            />
          ))}
        </div>
      )}

      {/* ── Carousel again, mid-page, so it keeps showing up as the user scrolls ── */}
      {filtered.length > 0 && <UniversityCarousel universities={filtered} onOpen={setSelected} title="" />}

      {/* ── Carousel once more near the bottom (replaces the old full grid) ── */}
      {filtered.length > 0 && <UniversityCarousel universities={filtered} onOpen={setSelected} title="" />}

      <a href="https://wa.me/265999626944" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 text-xs font-bold text-sky-500 active:scale-[0.98] transition-all py-2">
        <Link2 className="w-3.5 h-3.5" /> Want To Help Add Link? Click Here
      </a>

      {selected && <UniversityDetailModal university={selected} onClose={() => setSelected(null)} />}
      {selectedFile && (
        <EducationFileDetailModal
          file={selectedFile}
          universityName={universityNameById.get(selectedFile.university_id) ?? "Unknown university"}
          currentUserId={currentUserId}
          onClose={() => setSelectedFile(null)}
          onDownload={handleDownloadFile}
          onDelete={(id) => { setFiles(prev => prev.filter(x => x.id !== id)); setSelectedFile(null); }}
        />
      )}
      {showUpload && (
        <UploadFileModal
          universities={universities}
          onClose={() => setShowUpload(false)}
          onUploaded={(f) => setFiles(prev => [f, ...prev])}
        />
      )}
    </div>
  );
}
