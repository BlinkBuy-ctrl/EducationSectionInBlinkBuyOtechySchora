import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Music, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon, Mic2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { bookshopSupabase } from "@/lib/bookshopSupabase";
import { useToast } from "@/hooks/use-toast";
import {
  AUDIOBOOK_CATEGORIES, TABLE_AUDIOBOOKS, BUCKET_COVERS,
  MAX_AUDIO_FILE_SIZE, ACCEPTED_AUDIO_MIME,
  getAudioDuration, uploadAudioWithProgress, removeAudioFile, formatFileSize,
} from "@/lib/audiobooks";

interface Props { userId: string; onClose: () => void; onSuccess: () => void; }
type Status = "idle" | "reading" | "uploading" | "saving" | "done" | "error";

export function AudioBookUploadModal({ userId, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [audioFile,    setAudioFile]    = useState<File | null>(null);
  const [duration,     setDuration]     = useState(0);
  const [coverFile,    setCoverFile]    = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [status,       setStatus]       = useState<Status>("idle");
  const [progress,     setProgress]     = useState(0);
  const [errMsg,       setErrMsg]       = useState("");
  const [form, setForm] = useState({
    title: "", description: "", author: "", narrator: "",
    category: "Educational" as typeof AUDIOBOOK_CATEGORIES[number],
    price: "0",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const isLoading = ["reading", "uploading", "saving"].includes(status);

  const statusLabel: Record<Status, string> = {
    idle: "Publish Audio Book", reading: "Reading audio…", uploading: "Uploading…",
    saving: "Saving…", done: "Published! ✅", error: "Retry",
  };

  const handleAudioFile = async (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_AUDIO_FILE_SIZE) { setErrMsg("File exceeds 300 MB."); return; }
    setErrMsg(""); setAudioFile(f);
    setForm(p => ({ ...p, title: p.title || f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ") }));

    setStatus("reading");
    const d = await getAudioDuration(f);
    setDuration(d);
    setStatus("idle");
  };

  const handleCoverFile = (f: File | null) => {
    if (!f) return;
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!audioFile)          { setErrMsg("Select an audio file."); return; }
    if (!form.title.trim())  { setErrMsg("Title required."); return; }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) { setErrMsg("Invalid price."); return; }

    setErrMsg(""); setProgress(0);
    let audioPath = "";

    try {
      setStatus("uploading");
      audioPath = await uploadAudioWithProgress(audioFile, userId, (pct) => setProgress(Math.round(pct * 0.75)));
      setProgress(75);

      // Cover art -> existing public otechy-images bucket (same pattern as PDF thumbnails)
      let coverPublicUrl: string | null = null;
      if (coverFile) {
        const coverPath = `audiobook-covers/${userId}-${Date.now()}.jpg`;
        const { error: cErr } = await supabase.storage
          .from(BUCKET_COVERS)
          .upload(coverPath, coverFile, { upsert: false, contentType: coverFile.type || "image/jpeg" });
        if (!cErr) {
          const { data: urlData } = supabase.storage.from(BUCKET_COVERS).getPublicUrl(coverPath);
          coverPublicUrl = urlData?.publicUrl ?? null;
        }
      }

      setProgress(90); setStatus("saving");

      const ext = audioFile.name.split(".").pop()?.toLowerCase() ?? "mp3";
      const { error: dbErr } = await bookshopSupabase.from(TABLE_AUDIOBOOKS).insert({
        uploader_id:      userId,
        title:            form.title.trim(),
        description:      form.description.trim() || null,
        author:           form.author.trim() || null,
        narrator:         form.narrator.trim() || null,
        category:         form.category,
        price,
        audio_url:        audioPath,
        audio_format:     ext,
        file_size:        audioFile.size,
        duration_seconds: duration || null,
        cover_url:        coverPublicUrl,
      });

      if (dbErr) {
        await removeAudioFile(audioPath);
        throw new Error(dbErr.message);
      }

      setProgress(100); setStatus("done");
      toast({ title: "✅ Published!", description: "Your audio book is now live." });

      fetch("/api/send-app-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "🎧 New Audio Book on SchoraHub!",
          body: `"${form.title.trim()}" just got uploaded — listen now.`,
          url: "/",
        }),
      }).catch(() => {});

      setTimeout(() => { onSuccess(); onClose(); }, 800);

    } catch (e: any) {
      setStatus("error");
      setErrMsg(e.message ?? "Something went wrong.");
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 0px) + 12px)" }}
      onClick={e => { if (e.target === e.currentTarget && !isLoading) onClose(); }}>
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto">

        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-pink-600/10 to-purple-600/10 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center">
              <Music className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">Upload Audio Book</p>
              <p className="text-[10px] text-muted-foreground">Sell or share for free</p>
            </div>
          </div>
          <button onClick={() => { if (!isLoading) onClose(); }} disabled={isLoading}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground disabled:opacity-40">
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

          {/* Audio file picker */}
          <div onClick={() => !isLoading && audioRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleAudioFile(e.dataTransfer.files?.[0] ?? null); }}
            className={`border-2 border-dashed rounded-xl overflow-hidden transition-colors p-6 flex flex-col items-center gap-2 ${
              isLoading ? "opacity-60 cursor-not-allowed border-border"
                        : "border-pink-500/30 hover:border-pink-500/70 cursor-pointer"
            }`}>
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
              {status === "reading"
                ? <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
                : audioFile
                ? <Music className="w-6 h-6 text-pink-500" />
                : <Upload className="w-6 h-6 text-pink-400" />}
            </div>
            <p className="text-sm font-medium">
              {status === "reading" ? "Reading duration…" : audioFile ? audioFile.name : "Click or drag audio file here"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {audioFile
                ? `${formatFileSize(audioFile.size)}${duration ? ` · ${Math.round(duration / 60)} min` : ""}`
                : "MP3, M4A, WAV, AAC, OGG, FLAC — max 300 MB"}
            </p>
          </div>
          <input ref={audioRef} type="file" className="hidden" accept={ACCEPTED_AUDIO_MIME}
            onChange={e => handleAudioFile(e.target.files?.[0] ?? null)} disabled={isLoading} />

          {/* Cover art picker (optional) */}
          <div onClick={() => !isLoading && coverRef.current?.click()}
            className={`border border-dashed rounded-xl overflow-hidden transition-colors ${
              isLoading ? "opacity-60 cursor-not-allowed border-border" : "border-border hover:border-purple-500/50 cursor-pointer"
            }`}>
            {coverPreview ? (
              <div className="relative">
                <img src={coverPreview} alt="Cover" className="w-full max-h-48 object-cover" />
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-white/80 text-[10px]">Tap to change cover</p>
                </div>
              </div>
            ) : (
              <div className="p-4 flex items-center gap-2.5 justify-center">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Add cover image (optional)</p>
              </div>
            )}
          </div>
          <input ref={coverRef} type="file" className="hidden" accept="image/*"
            onChange={e => handleCoverFile(e.target.files?.[0] ?? null)} disabled={isLoading} />

          {isLoading && status !== "reading" && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{statusLabel[status]}</span>
                <span className="font-bold text-pink-400">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Title <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e => set("title", e.target.value)} disabled={isLoading}
              placeholder="e.g. Chamdika — Full Audio Book"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 disabled:opacity-60" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Author</label>
              <input value={form.author} onChange={e => set("author", e.target.value)} disabled={isLoading}
                placeholder="Book author"
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 disabled:opacity-60" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block flex items-center gap-1">
                <Mic2 className="w-3 h-3" /> Narrator
              </label>
              <input value={form.narrator} onChange={e => set("narrator", e.target.value)} disabled={isLoading}
                placeholder="Voice narrator"
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 disabled:opacity-60" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Description <span className="text-muted-foreground/50">(optional)</span></label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              rows={2} disabled={isLoading} placeholder="What's this audio book about?"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-none disabled:opacity-60" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Category</label>
              <select value={form.category} onChange={e => set("category", e.target.value)} disabled={isLoading}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 disabled:opacity-60">
                {AUDIOBOOK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Price (MK) — 0 = Free</label>
              <input type="number" min="0" step="50" value={form.price}
                onChange={e => set("price", e.target.value)} disabled={isLoading}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 disabled:opacity-60" />
            </div>
          </div>

          <button onClick={handleSubmit} disabled={isLoading || status === "done"}
            className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-all active:scale-[0.98] shadow-md disabled:cursor-not-allowed ${
              status === "done"  ? "bg-green-500 text-white"
              : status === "error" ? "bg-gradient-to-r from-red-500 to-orange-500 text-white"
              : "bg-gradient-to-r from-pink-600 to-purple-600 disabled:opacity-60 text-white"
            }`}>
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" />{statusLabel[status]}</>
              : status === "done"
              ? <><CheckCircle2 className="w-4 h-4" />{statusLabel[status]}</>
              : <><Upload className="w-4 h-4" />{statusLabel[status]}</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
