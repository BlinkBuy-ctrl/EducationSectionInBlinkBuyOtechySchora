import { useState, useRef } from "react";
import { X, Upload, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Past Papers", "Textbooks", "Notes", "Research", "Other"];

interface UploadModalProps {
  /** Supabase user.id of the currently logged-in user */
  userId: string;
  onClose: () => void;
  /** Called after a successful upload so the parent can refresh the list */
  onSuccess: () => void;
}

export function UploadModal({ userId, onClose, onSuccess }: UploadModalProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile]     = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm]     = useState({
    title: "",
    description: "",
    category: "Notes",
    price: "0",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({ title: "No file selected", description: "Please pick a PDF or DOC.", variant: "destructive" });
      return;
    }
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // 1. Upload file to Storage — path: userId/timestamp.ext
      const ext  = file.name.split(".").pop() ?? "pdf";
      const path = `${userId}/${Date.now()}.${ext}`;

      const { error: storageErr } = await supabase.storage
        .from("otechy-docs")
        .upload(path, file, { upsert: false, contentType: file.type });

      if (storageErr) throw storageErr;

      // 2. Save metadata — store the storage path, NOT a signed URL
      //    Signed URLs are generated fresh on every download request
      const { error: dbErr } = await supabase
        .from("otechy_resources")
        .insert({
          uploader_id:    userId,
          title:          form.title.trim(),
          description:    form.description.trim() || null,
          category:       form.category,
          price:          parseFloat(form.price) || 0,
          file_url:       path,         // storage path
          file_name:      file.name,
          file_size:      file.size,
        });

      if (dbErr) throw dbErr;

      toast({ title: "✅ Published!", description: "Your resource is now live on OtechySchora." });
      onSuccess();
      onClose();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Close on backdrop click
  const onBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
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
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-5 flex flex-col gap-4">

          {/* File Drop Zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-purple-500/30 hover:border-purple-500/70 rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 flex items-center justify-center transition-colors">
              {file
                ? <FileText className="w-5 h-5 text-purple-500" />
                : <Upload className="w-5 h-5 text-purple-400" />
              }
            </div>
            <p className="text-sm font-medium text-foreground">
              {file ? file.name : "Click to select file"}
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
          />

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="e.g. MSCE Biology Past Papers 2023"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-shadow"
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
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none transition-shadow"
            />
          </div>

          {/* Category + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Category</label>
              <select
                value={form.category}
                onChange={e => set("category", e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-150 active:scale-[0.98] shadow-md"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
              : <><Upload className="w-4 h-4" /> Publish Resource</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
