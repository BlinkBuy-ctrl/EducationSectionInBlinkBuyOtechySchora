import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Upload, Store } from "lucide-react";
import { applyAsBookshop } from "@/lib/bookshops";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Props { onClose: () => void; }

export function BookshopApplyModal({ onClose }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const certRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [location, setLocation] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [certFile, setCertFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || !contact.trim() || !email.trim() || !certFile) {
      toast({ title: "Missing required info", description: "Shop name, contact, email, and a registration/certificate photo are all required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await applyAsBookshop({ name: name.trim(), about: about.trim(), location: location.trim(), contact: contact.trim(), email: email.trim(), ownerAnonId: user.id, logoFile, certFile });
      toast({ title: "✅ Application submitted", description: "We'll review your certificate — you'll get a notification here once approved." });
      onClose();
    } catch (e: any) {
      toast({ title: "Failed to submit", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.75)" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg bg-card rounded-t-3xl flex flex-col overflow-hidden" style={{ height: "88vh", maxHeight: "88vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border shrink-0">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center"><Store className="w-5 h-5 text-purple-400" /></div>
          <div className="flex-1"><h2 className="font-black text-base">Open your E-BookStore</h2><p className="text-[11px] text-muted-foreground">Verified real shops only — a registration/certificate photo is required</p></div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-2.5">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Shop name *"
            className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          <textarea value={about} onChange={e => setAbout(e.target.value)} placeholder="About your bookshop" rows={3}
            className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location (e.g. Blantyre, Limbe)"
            className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Contact (WhatsApp/phone) *"
            className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email * (approval confirmation sent here)"
            className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />

          <div onClick={() => logoRef.current?.click()} className="h-20 rounded-xl border-2 border-dashed border-border cursor-pointer flex items-center justify-center gap-2 text-muted-foreground text-xs">
            <Upload className="w-4 h-4" /> {logoFile ? logoFile.name : "Upload shop logo (optional)"}
            <input ref={logoRef} type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] ?? null)} className="hidden" />
          </div>

          <div onClick={() => certRef.current?.click()} className="h-20 rounded-xl border-2 border-dashed border-purple-500/50 cursor-pointer flex items-center justify-center gap-2 text-purple-400 text-xs font-semibold">
            <Upload className="w-4 h-4" /> {certFile ? certFile.name : "Upload registration/certificate photo *"}
            <input ref={certRef} type="file" accept="image/*,.pdf" onChange={e => setCertFile(e.target.files?.[0] ?? null)} className="hidden" />
          </div>

          <p className="text-[10px] text-muted-foreground pt-1">
            Next: once approved, you'll get an email to create your shop login (Phase 2) and manage books/orders yourself.
          </p>

          <button onClick={submit} disabled={saving}
            className="w-full flex items-center justify-center gap-2 font-semibold py-2.5 rounded-xl bg-purple-600 text-white active:scale-[0.98] disabled:opacity-60 mt-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit for review"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
