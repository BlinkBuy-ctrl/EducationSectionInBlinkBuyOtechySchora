import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Send, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Props { onClose: () => void; }
interface ChatMessage { role: "user" | "assistant"; content: string; }

export function AiModeChat({ onClose }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hey! Ask me about any book in the library — I can help you find one, or dig into what's actually inside it." },
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai-mode-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId, userUuid: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      setConversationId(data.conversationId);
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      const detail = e?.message ? ` (${e.message})` : "";
      setMessages(prev => [...prev, { role: "assistant", content: `Sorry, I ran into an issue answering that — try again in a moment.${detail}` }]);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full sm:max-w-md h-[85vh] sm:h-[70vh] bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-sky-600 to-blue-600">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-black">AI Mode</span>
          </div>
          <button onClick={onClose} aria-label="Close AI Mode" className="text-white/90 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-3.5 py-2.5 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Thinking…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-3 border-t border-border flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") send(); }}
            placeholder="Ask about a book…"
            disabled={loading}
            className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-60"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            aria-label="Send"
            className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
