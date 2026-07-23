import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { bookshopSupabase } from "@/lib/bookshopSupabase";
import { safeGetItem, safeSetItem } from "@/lib/storage";
import {
  ArrowLeft, BookOpen, Send, Paperclip, FileText, X,
  Loader2, Download, Copy, Trash2, Settings, Check, Image,
} from "lucide-react";

type Msg = {
  id: string;
  sender_id: string;
  sender_name: string;
  message: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  created_at: string;
  _status?: "sending" | "failed";
};

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB
const ATTACHMENT_BUCKET = "book-request-attachments";

const WALLPAPER_KEY = "book_request_wallpaper_on";
const BUBBLE_COLOR_KEY = "book_request_bubble_color";

const BUBBLE_PRESETS: { id: string; label: string; swatch: string; classes: string }[] = [
  { id: "purple-blue", label: "Default",  swatch: "bg-gradient-to-br from-purple-500 to-blue-600",   classes: "from-purple-500 to-blue-600" },
  { id: "green",       label: "Green",    swatch: "bg-gradient-to-br from-emerald-500 to-teal-600",  classes: "from-emerald-500 to-teal-600" },
  { id: "sunset",      label: "Sunset",   swatch: "bg-gradient-to-br from-orange-500 to-pink-600",   classes: "from-orange-500 to-pink-600" },
  { id: "ocean",       label: "Ocean",    swatch: "bg-gradient-to-br from-sky-500 to-blue-700",      classes: "from-sky-500 to-blue-700" },
  { id: "berry",       label: "Berry",    swatch: "bg-gradient-to-br from-fuchsia-500 to-purple-700", classes: "from-fuchsia-500 to-purple-700" },
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " · " +
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fileSizeLabel(bytes?: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BookRequestCenter() {
  const [, navigate] = useLocation();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const senderName = profile?.name || `User-${user.id.slice(0, 6)}`;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const [pendingFile, setPendingFile] = useState<{
    file: File; url?: string; uploading: boolean;
  } | null>(null);

  const [actionSheetMsg, setActionSheetMsg] = useState<Msg | null>(null);

  /* ── Personal chat settings: wallpaper + bubble colour (device-local, not synced) ── */
  const [wallpaperOn, setWallpaperOn] = useState(() => safeGetItem(WALLPAPER_KEY) !== "off");
  const [bubbleColorId, setBubbleColorId] = useState(() => safeGetItem(BUBBLE_COLOR_KEY) || "purple-blue");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const bubbleClasses = BUBBLE_PRESETS.find((p) => p.id === bubbleColorId)?.classes || BUBBLE_PRESETS[0].classes;

  const toggleWallpaper = () => {
    const next = !wallpaperOn;
    setWallpaperOn(next);
    safeSetItem(WALLPAPER_KEY, next ? "on" : "off");
  };

  const pickBubbleColor = (id: string) => {
    setBubbleColorId(id);
    safeSetItem(BUBBLE_COLOR_KEY, id);
  };

  const listEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      listEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    });
  }, []);

  /* ── Load history (latest first, then reversed to chronological order) ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await bookshopSupabase
        .from("book_request_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (error) {
        toast({ title: "Couldn't load the group", description: error.message, variant: "destructive" });
      } else {
        setMessages(((data as Msg[]) ?? []).slice().reverse());
      }
      setLoading(false);
      scrollToBottom(false);
    })();
    return () => { cancelled = true; };
  }, [scrollToBottom, toast]);

  /* ── Realtime: instant delivery, no reload ── */
  useEffect(() => {
    const channel = bookshopSupabase
      .channel("book_request_messages_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "book_request_messages" },
        (payload) => {
          const row = payload.new as Msg;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
          scrollToBottom();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "book_request_messages" },
        (payload) => {
          const oldRow = payload.old as Partial<Msg>;
          setMessages((prev) => prev.filter((m) => m.id !== oldRow.id));
        }
      )
      .subscribe();

    return () => { bookshopSupabase.removeChannel(channel); };
  }, [scrollToBottom]);

  /* ── Attach a file ── */
  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: "File too large", description: "Please attach something under 15MB.", variant: "destructive" });
      return;
    }
    setPendingFile({ file, uploading: true });
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    try {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error: upErr } = await bookshopSupabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = bookshopSupabase.storage.from(ATTACHMENT_BUCKET).getPublicUrl(path);
      setPendingFile({ file, url: pub.publicUrl, uploading: false });
    } catch (e: any) {
      toast({ title: "Attachment failed", description: e.message, variant: "destructive" });
      setPendingFile(null);
    }
  };

  const removePendingFile = () => setPendingFile(null);

  /* ── Send ── */
  const canSend = (text.trim().length > 0 || (pendingFile && !pendingFile.uploading && pendingFile.url)) && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    const tempId = `temp-${Date.now()}`;
    const body = text.trim();
    const attachment = pendingFile?.url
      ? {
          attachment_url: pendingFile.url,
          attachment_name: pendingFile.file.name,
          attachment_type: pendingFile.file.type || "application/octet-stream",
        }
      : { attachment_url: null, attachment_name: null, attachment_type: null };

    const optimistic: Msg = {
      id: tempId,
      sender_id: user.id,
      sender_name: senderName,
      message: body || null,
      ...attachment,
      created_at: new Date().toISOString(),
      _status: "sending",
    };

    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setPendingFile(null);
    setSending(true);
    scrollToBottom();

    const { data, error } = await bookshopSupabase
      .from("book_request_messages")
      .insert({ sender_id: user.id, sender_name: senderName, message: body || null, ...attachment })
      .select()
      .single();

    setSending(false);

    if (error || !data) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, _status: "failed" } : m)));
      toast({ title: "Message failed to send", description: error?.message, variant: "destructive" });
      return;
    }
    setMessages((prev) => prev.map((m) => (m.id === tempId ? (data as Msg) : m)));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── Copy / delete a message ── */
  const handleCopy = async (m: Msg) => {
    setActionSheetMsg(null);
    try {
      await navigator.clipboard.writeText(m.message || m.attachment_url || "");
      toast({ title: "Copied" });
    } catch {
      toast({ title: "Couldn't copy", variant: "destructive" });
    }
  };

  const handleDelete = async (m: Msg) => {
    setActionSheetMsg(null);
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    const { error } = await bookshopSupabase.from("book_request_messages").delete().eq("id", m.id);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      setMessages((prev) => [...prev, m].sort((a, b) => a.created_at.localeCompare(b.created_at)));
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      {/* ── Header ── */}
      <div className="shrink-0 bg-sidebar border-b border-sidebar-border"
           style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="px-3 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            aria-label="Back"
            className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-white/80 active:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow shadow-purple-500/20">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-white text-[15px] truncate">BookRequest</h1>
              <span className="relative flex w-1.5 h-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
              </span>
            </div>
            <p className="text-[11px] text-white/50">Anyone here can help you find a book</p>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Chat settings"
            className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-white/70 active:bg-white/5 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Messages (with optional wallpaper) ── */}
      <div className="relative flex-1 overflow-hidden">
        {wallpaperOn && (
          <div
            className="absolute inset-0 bg-center bg-no-repeat bg-contain opacity-[0.06] blur-[2px] pointer-events-none"
            style={{ backgroundImage: "url(/icons/icon-512.png)", backgroundSize: "55%" }}
          />
        )}
        <div className="absolute inset-0 overflow-y-auto px-3 py-4"
             style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-600/20 border border-purple-500/30 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-sm font-bold text-foreground">No requests yet</p>
              <p className="text-xs text-muted-foreground max-w-[240px]">
                Can't find a book? Ask here — anyone in the community can share a copy or point you to it.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((m) => {
                const mine = m.sender_id === user.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
                      {!mine && (
                        <span className="text-[11px] font-bold text-purple-300 mb-0.5 px-1">{m.sender_name}</span>
                      )}
                      <div
                        onClick={() => setActionSheetMsg(m)}
                        className={
                          mine
                            ? `rounded-2xl rounded-br-md bg-gradient-to-br ${bubbleClasses} text-white shadow-md shadow-black/10 px-3.5 py-2.5 active:opacity-90 transition-opacity`
                            : "rounded-2xl rounded-bl-md bg-sidebar/90 backdrop-blur-sm border border-sidebar-border text-white px-3.5 py-2.5 active:opacity-90 transition-opacity"
                        }
                      >
                        {m.message && (
                          <p className="text-[13.5px] leading-snug whitespace-pre-wrap break-words">{m.message}</p>
                        )}
                        {m.attachment_url && (
                          <a
                            href={m.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1.5 flex items-center gap-2 rounded-xl px-2.5 py-2 bg-white/15 active:bg-white/20 transition-colors"
                          >
                            <FileText className="w-4 h-4 shrink-0 text-white" />
                            <span className="text-[12px] font-semibold truncate flex-1 text-white">{m.attachment_name}</span>
                            <Download className="w-3.5 h-3.5 shrink-0 text-white/80" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 px-1">
                        <span className="text-[10px] text-muted-foreground">{formatTime(m.created_at)}</span>
                        {m._status === "sending" && <Loader2 className="w-2.5 h-2.5 animate-spin text-muted-foreground" />}
                        {m._status === "failed" && <span className="text-[10px] text-red-400 font-semibold">Failed</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={listEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* ── Pending attachment preview ── */}
      {pendingFile && (
        <div className="shrink-0 px-3 pt-2 bg-sidebar">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            {pendingFile.uploading ? (
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-purple-400 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{pendingFile.file.name}</p>
              <p className="text-[10px] text-white/50">
                {pendingFile.uploading ? "Uploading…" : fileSizeLabel(pendingFile.file.size)}
              </p>
            </div>
            <button onClick={removePendingFile} className="w-6 h-6 rounded-full flex items-center justify-center text-white/60 active:bg-white/10">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="shrink-0 bg-sidebar border-t border-sidebar-border px-3 py-2.5 flex items-end gap-2"
           style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom, 0px))" }}>
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileChosen} />
        <button
          onClick={handlePickFile}
          aria-label="Attach a document"
          className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white/70 active:bg-white/5 transition-colors"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask for a book, or help someone find one…"
          className="flex-1 min-w-0 bg-white/10 border border-white/15 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send"
          className={`w-10 h-10 shrink-0 rounded-full bg-gradient-to-br ${bubbleClasses} flex items-center justify-center shadow-lg shadow-black/20 active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100`}
        >
          {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
        </button>
      </div>

      {/* ── Copy / delete action sheet ── */}
      {actionSheetMsg && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setActionSheetMsg(null)}
        >
          <div
            className="w-full sm:max-w-md bg-sidebar border border-sidebar-border rounded-t-2xl overflow-hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-2.5 mb-1" />
            {actionSheetMsg.message && (
              <button
                onClick={() => handleCopy(actionSheetMsg)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/5 transition-colors"
              >
                <Copy className="w-4 h-4 text-white/70" />
                <span className="text-sm font-semibold text-white">Copy message</span>
              </button>
            )}
            {actionSheetMsg.sender_id === user.id && (
              <button
                onClick={() => handleDelete(actionSheetMsg)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left active:bg-red-500/10 transition-colors border-t border-sidebar-border"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-red-400">Delete message</span>
              </button>
            )}
            <button
              onClick={() => setActionSheetMsg(null)}
              className="w-full px-5 py-3.5 text-center text-sm font-semibold text-white/50 border-t border-sidebar-border active:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Chat settings sheet: wallpaper + message colour ── */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-sidebar border border-sidebar-border rounded-t-2xl overflow-hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-2.5 mb-3" />
            <div className="px-5 pb-2">
              <h2 className="text-sm font-black text-white">Chat settings</h2>
            </div>

            {/* Wallpaper toggle */}
            <button
              onClick={toggleWallpaper}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-left active:bg-white/5 transition-colors"
            >
              <Image className="w-4 h-4 text-white/70 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">Chat wallpaper</div>
                <div className="text-[11px] text-white/50">SchoraHub mark, faded behind messages</div>
              </div>
              <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${wallpaperOn ? "bg-purple-500 justify-end" : "bg-white/15 justify-start"}`}>
                <div className="w-5 h-5 rounded-full bg-white shadow" />
              </div>
            </button>

            {/* Bubble colour picker */}
            <div className="px-5 pt-1 pb-4 border-t border-sidebar-border">
              <div className="text-sm font-semibold text-white mb-2.5 mt-3">Message colour</div>
              <div className="flex items-center gap-3">
                {BUBBLE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => pickBubbleColor(p.id)}
                    aria-label={p.label}
                    className={`w-11 h-11 rounded-full ${p.swatch} flex items-center justify-center shadow-md shadow-black/20 active:scale-90 transition-transform ring-2 ${bubbleColorId === p.id ? "ring-white" : "ring-transparent"}`}
                  >
                    {bubbleColorId === p.id && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSettingsOpen(false)}
              className="w-full px-5 py-3.5 text-center text-sm font-semibold text-white/50 border-t border-sidebar-border active:bg-white/5 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
