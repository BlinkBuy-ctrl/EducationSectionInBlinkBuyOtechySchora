import { useEffect, useMemo, useState } from "react";
import {
  Link2, Loader2, Upload, FileText, FileSpreadsheet,
  Presentation, Image as ImageIcon, File as FileIcon, X, Trash2, ExternalLink,
} from "lucide-react";
import { getUniversities, type University } from "@/lib/universities";
import {
  getEducationFiles,
  uploadEducationFile,
  deleteEducationFile,
  detectFileType,
  EDUCATION_FILE_CATEGORIES,
  ACCEPTED_FILE_EXTENSIONS,
  type EducationFile,
  type EducationFileType,
} from "@/lib/educationFiles";
import { UniversityCarousel } from "@/components/education/UniversityCarousel";
import { AnimatedSearchInput } from "@/components/education/AnimatedSearchInput";
import { UniversityDetailModal } from "@/components/education/UniversityDetailModal";
import { useToast } from "@/hooks/use-toast";
import { getCache, setCache } from "@/lib/offlineCache";

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

function EducationFileCard({ file, universityName, onDelete }: { file: EducationFile; universityName: string; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const Icon = FILE_TYPE_ICON[file.file_type] ?? FileIcon;
  const showCover = !!file.cover_url && !coverFailed;

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
    <a
      href={file.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-2 bg-card border border-border rounded-2xl p-3 active:scale-[0.97] transition-all"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
    >
      <div className="relative w-full aspect-[3/4] rounded-xl bg-sky-500/10 flex items-center justify-center overflow-hidden shrink-0">
        {showCover ? (
          <img src={file.cover_url!} alt="" className="w-full h-full object-cover" onError={() => setCoverFailed(true)} />
        ) : (
          <Icon className="w-9 h-9 text-sky-500" />
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete file"
          className="absolute top-1.5 right-1.5 bg-background/80 backdrop-blur rounded-full p-1.5 text-muted-foreground/70 active:scale-90 transition-transform"
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
      <p className="text-xs font-bold text-foreground line-clamp-2 leading-snug">{file.title}</p>
      <p className="text-[10px] text-sky-500 font-semibold truncate">{universityName}</p>
      <p className="text-[10px] text-muted-foreground truncate">{file.program} • {file.category}</p>
      <div className="flex items-center gap-1 text-[10px] font-bold text-sky-500 mt-0.5">
        Open <ExternalLink className="w-2.5 h-2.5" />
      </div>
    </a>
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
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = universityId && program.trim() && category && title.trim() && file && !submitting;

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
              placeholder="e.g. Intro to Computer Systems — Notes Ch.1"
              className="w-full mt-1 bg-card border border-border rounded-xl p-2.5 text-sm text-foreground"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Your name (optional)</label>
            <input
              value={uploadedBy}
              onChange={(e) => setUploadedBy(e.target.value)}
              placeholder="e.g. Chikondi"
              className="w-full mt-1 bg-card border border-border rounded-xl p-2.5 text-sm text-foreground"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">File</label>
            <input
              type="file"
              accept={ACCEPTED_FILE_EXTENSIONS}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full mt-1 text-sm text-foreground"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              PDF, Word, Excel, PowerPoint, CSV or images. Max 50MB.
              {file && (["docx", "xlsx", "pptx"].includes(file.name.split(".").pop()?.toLowerCase() ?? "") || detectFileType(file.name) === "image") &&
                " A cover will be generated automatically."}
            </p>
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
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<University | null>(null);

  const [files, setFiles] = useState<EducationFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [fileFilterUniId, setFileFilterUniId] = useState<string>("");

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
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
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
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
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
