import { useState, useRef } from "react";
import { X, Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Past Papers", "Textbooks", "Notes", "Research", "Other"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

interface UploadModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type UploadStatus = "idle" | "uploading" | "saving" | "done" | "error";

export function UploadModal({ userId, onClose, onSuccess }: UploadModalProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file,     setFile]     = useState<File | null>(null);
  const [status,   setStatus]   = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errMsg,   setErrMsg]   = useState("");
  const [form,     setForm]     = useState({
    title: "", description: "", category: "Notes", price: "0",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const isLoading = status === "uploading" || status === "saving";

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_FILE_SIZE) {
      setErrMsg("File exceeds 50 MB limit. Please choose a smaller file.");
      setFile(null);
      return;
    }
    setErrMsg("");
    setFile(f);
    setStatus("idle");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      setErrMsg("File exceeds 50 MB limit.");
      return;
    }
    setErrMsg("");
    setFile(f);
    setStatus("idle");
  };

  const handleSubmit = async () => {
    // — Validation —
    if (!file) {
      setErrMsg("Please select a file before uploading.");
      return;
    }
    if (!form.title.trim()) {
      setErrMsg("A title is required.");
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      setErrMsg("Price must be a positive number or 0 for free.");
      return;
    }

    setErrMsg("");
    setProgress(0);

    try {
      // ── Step 1: Upload file to Supabase Storage ──
      setStatus("uploading");
      setProgress(20);

      const ext  = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: storageErr } = await supabase.storage
        .from("otechy-docs")
        .upload(path, file, {
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });

      // FIX: explicit throw on storage error — prevents silent hang
      if (storageErr) {
        throw new Error(`Storage error: ${storageErr.message}`);
      }

      setProgress(70);

      // ── Step 2: Save metadata to DB ──
      setStatus("saving");

      const { error: dbErr } = await supabase
        .from("otechy_resources")
        .insert({
          uploader_id: userId,
          title:       form.title.trim(),
          description: form.description.trim() || null,
          category:    form.category,
          price:       price,
          file_url:    path,        // storage path, NOT a signed URL
          file_name:   file.name,
          file_size:   file.size,
        });

      // FIX: explicit throw on DB error
      if (dbErr) {
        // Rollback: clean up orphaned file in storage
        await supabase.storage.from("otechy-docs").remove([path]).catch(() => {});
        throw new Error(`Database error: ${dbErr.message}`);
      }

      setProgress(100);
      setStatus("done");

      toast({ title: "✅ Published!", description: "Your resource is now live on OtechySchora." });

      // Short delay so user sees success state before modal closes
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);

    } catch (e: any) {
      // FIX: ALWAYS land here — never hangs
      setStatus("error");
      setErrMsg(e.message ?? "Something went wrong. Please try again.");
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    }
    // NOTE: no finally needed — every code path above sets status explicitly
  };

  const onBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isLoading) onClose();
  };

  const statusLabel: Record<UploadStatus, string> = {
    idle:      "Publish Resource",
    uploading: "Uploading file…",
    saving:    "Saving to database…",
    done:      "Published! ✅",
    error:     "Retry Upload",
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onBackdrop}
    >
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-purple-600/10 to-blue-600/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <Upload className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Upload Resource</p>
              <p className="text-[10px] text-muted-foreground">Sell or share for free</p>
            </div>
          </div>
          <button
            onClick={() => { if (!isLoading) onClose(); }}
            disabled={isLoading}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-5 flex flex-col gap-4">

          {/* Error banner */}
          {errMsg && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-500 font-medium">{errMsg}</p>
            </div>
          )}

          {/* File Drop Zone */}
          <div
            onClick={() => !isLoading && fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2 transition-colors ${
              isLoading
                ? "border-border cursor-not-allowed opacity-60"
                : "border-purple-500/30 hover:border-purple-500/70 cursor-pointer group"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 flex items-center justify-center transition-colors">
              {status === "done"
                ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                : file
                ? <FileText className="w-5 h-5 text-purple-500" />
                : <Upload className="w-5 h-5 text-purple-400" />
              }
            </div>
            <p className="text-sm font-medium text-foreground">
              {file ? file.name : "Click or drag file here"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {file
                ? `${(file.size / 1024).toFixed(0)} KB · ${file.type || "document"}`
                : "PDF, DOC, DOCX — max 50 MB"
              }
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFile}
            disabled={isLoading}
          />

          {/* Upload progress bar */}
          {isLoading && (
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="e.g. MSCE Biology Past Papers 2023"
              disabled={isLoading}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-shadow disabled:opacity-60"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Description <span className="text-muted-foreground/50">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              rows={2}
              placeholder="What's inside this document?"
              disabled={isLoading}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none transition-shadow disabled:opacity-60"
            />
          </div>

          {/* Category + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Category</label>
              <select
                value={form.category}
                onChange={e => set("category", e.target.value)}
                disabled={isLoading}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-60"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Price (MK) — 0 = Free
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={form.price}
                onChange={e => set("price", e.target.value)}
                disabled={isLoading}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || status === "done"}
            className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-all duration-150 active:scale-[0.98] shadow-md disabled:cursor-not-allowed ${
              status === "done"
                ? "bg-green-500 text-white opacity-90"
                : status === "error"
                ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white"
                : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-60 text-white"
            }`}
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {statusLabel[status]}</>
            ) : status === "done" ? (
              <><CheckCircle2 className="w-4 h-4" /> {statusLabel[status]}</>
            ) : (
              <><Upload className="w-4 h-4" /> {statusLabel[status]}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
