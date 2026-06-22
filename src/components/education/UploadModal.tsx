import { useState, useRef } from "react";
import { X, Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Past Papers", "Textbooks", "Notes", "Research", "Other"];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface Props { userId: string; onClose: () => void; onSuccess: () => void; }
type Status = "idle" | "thumbnail" | "uploading" | "saving" | "done" | "error";

// Extract first page of PDF as JPEG blob via canvas
async function extractPdfThumbnail(file: File): Promise<Blob | null> {
  try {
    // Dynamically load pdfjs from CDN — no install needed
    const pdfjsLib = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.2.67/build/pdf.min.mjs" as any);
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.2.67/build/pdf.worker.min.mjs";

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    return new Promise(res => canvas.toBlob(blob => res(blob), "image/jpeg", 0.85));
  } catch {
    return null;
  }
}

export function UploadModal({ userId, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file,        setFile]        = useState<File | null>(null);
  const [thumbPreview,setThumbPreview]= useState<string | null>(null);
  const [status,      setStatus]      = useState<Status>("idle");
  const [progress,    setProgress]    = useState(0);
  const [errMsg,      setErrMsg]      = useState("");
  const [form,        setForm]        = useState({
    title: "", description: "", category: "Notes", price: "0",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const isLoading = ["thumbnail","uploading","saving"].includes(status);

  const handleFile = async (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) { setErrMsg("File exceeds 50 MB."); return; }
    setErrMsg(""); setFile(f); setThumbPreview(null); setStatus("idle");

    // Auto-fill title from filename
    const autoTitle = f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    setForm(p => ({ ...p, title: p.title || autoTitle }));

    // Extract thumbnail if PDF
    if (f.type === "application/pdf" || f.name.endsWith(".pdf")) {
      setStatus("thumbnail");
      const blob = await extractPdfThumbnail(f);
      if (blob) setThumbPreview(URL.createObjectURL(blob));
      setStatus("idle");
      // Store blob on window temp for upload
      (window as any).__pdfThumb = blob;
    }
  };

  const handleSubmit = async () => {
    if (!file)          { setErrMsg("Select a file."); return; }
    if (!form.title.trim()) { setErrMsg("Title is required."); return; }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) { setErrMsg("Invalid price."); return; }

    setErrMsg(""); setProgress(0);

    try {
      setStatus("uploading"); setProgress(15);

      const ext  = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
      const base = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      const path = `${base}.${ext}`;

      const { error: storageErr } = await supabase.storage
        .from("otechy-docs").upload(path, file, {
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });
      if (storageErr) throw new Error(storageErr.message);
      setProgress(60);

      // Upload thumbnail if we have one
      let thumbPath: string | null = null;
      const thumbBlob: Blob | null = (window as any).__pdfThumb ?? null;
      if (thumbBlob) {
        const tp = `${base}_thumb.jpg`;
        const { error: tErr } = await supabase.storage
          .from("otechy-docs").upload(tp, thumbBlob, { upsert: false, contentType: "image/jpeg" });
        if (!tErr) thumbPath = tp;
      }
      setProgress(75); setStatus("saving");

      const { error: dbErr } = await supabase.from("otechy_resources").insert({
        uploader_id: userId,
        title:       form.title.trim(),
        description: form.description.trim() || null,
        category:    form.category,
        price,
        file_url:    path,
        file_name:   file.name,
        file_size:   file.size,
        thumbnail_url: thumbPath,
      });
      if (dbErr) {
        await supabase.storage.from("otechy-docs").remove([path]).catch(() => {});
        throw new Error(dbErr.message);
      }

      setProgress(100); setStatus("done");
      delete (window as any).__pdfThumb;
      toast({ title: "✅ Published!", description: "Your resource is now live." });
      setTimeout(() => { onSuccess(); onClose(); }, 800);

    } catch (e: any) {
      setStatus("error");
      setErrMsg(e.message ?? "Something went wrong.");
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    }
  };

  const statusLabel: Record<Status, string> = {
    idle:      "Publish Resource",
    thumbnail: "Processing cover…",
    uploading: "Uploading file…",
    saving:    "Saving to database…",
    done:      "Published! ✅",
    error:     "Retry Upload",
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget && !isLoading) onClose(); }}>
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-purple-600/10 to-blue-600/10 sticky top-0 z-10 bg-card">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <Upload className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">Upload Resource</p>
              <p className="text-[10px] text-muted-foreground">Sell or share for free</p>
            </div>
          </div>
          <button onClick={() => { if (!isLoading) onClose(); }} disabled={isLoading}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {errMsg && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-500 font-medium">{errMsg}</p>
            </div>
          )}

          {/* Drop zone + thumbnail preview */}
          <div onClick={() => !isLoading && fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0] ?? null); }}
            className={`border-2 border-dashed rounded-xl overflow-hidden transition-colors ${
              isLoading ? "opacity-60 cursor-not-allowed" : "border-purple-500/30 hover:border-purple-500/70 cursor-pointer"
            }`}>
            {thumbPreview ? (
              <div className="relative">
                <img src={thumbPreview} alt="PDF cover" className="w-full object-cover max-h-52" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                  <p className="text-white text-xs font-semibold line-clamp-1">{file?.name}</p>
                </div>
                <div className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Cover extracted ✓
                </div>
              </div>
            ) : (
              <div className="p-5 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  {status === "thumbnail"
                    ? <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    : file
                    ? <FileText className="w-5 h-5 text-purple-500" />
                    : <Upload className="w-5 h-5 text-purple-400" />}
                </div>
                <p className="text-sm font-medium">
                  {status === "thumbnail" ? "Extracting cover…" : file ? file.name : "Click or drag file here"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {file ? `${(file.size/1024/1024).toFixed(1)} MB` : "PDF, DOC, DOCX — max 50 MB"}
                </p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" className="hidden"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={e => handleFile(e.target.files?.[0] ?? null)} disabled={isLoading} />

          {/* Progress */}
          {isLoading && status !== "thumbnail" && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{statusLabel[status]}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Title <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e => set("title", e.target.value)} disabled={isLoading}
              placeholder="e.g. MSCE Biology Past Papers 2023"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-60" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Description <span className="text-muted-foreground/50">(optional)</span></label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2}
              disabled={isLoading} placeholder="What's inside?"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none disabled:opacity-60" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Category</label>
              <select value={form.category} onChange={e => set("category", e.target.value)} disabled={isLoading}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-60">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Price (MK) — 0 = Free</label>
              <input type="number" min="0" step="50" value={form.price}
                onChange={e => set("price", e.target.value)} disabled={isLoading}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-60" />
            </div>
          </div>

          <button onClick={handleSubmit} disabled={isLoading || status === "done"}
            className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-all active:scale-[0.98] shadow-md disabled:cursor-not-allowed ${
              status === "done" ? "bg-green-500 text-white"
              : status === "error" ? "bg-gradient-to-r from-red-500 to-orange-500 text-white"
              : "bg-gradient-to-r from-purple-600 to-blue-600 disabled:opacity-60 text-white"
            }`}>
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" />{statusLabel[status]}</>
              : status === "done"
              ? <><CheckCircle2 className="w-4 h-4" />{statusLabel[status]}</>
              : <><Upload className="w-4 h-4" />{statusLabel[status]}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
