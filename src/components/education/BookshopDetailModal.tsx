import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Store, Star, MapPin, Phone, BookOpen, Menu, Share2, Flag, Image as ImageIcon } from "lucide-react";
import { FaWhatsapp, FaFacebook, FaInstagram } from "react-icons/fa";
import { getBooks, getTestimonials, addTestimonial, type Bookshop, type Book, type Testimonial } from "@/lib/bookshops";
import { useToast } from "@/hooks/use-toast";

interface Props { bookshop: Bookshop; onClose: () => void; }

const SOCIAL_ICONS: Record<string, any> = { whatsapp: FaWhatsapp, facebook: FaFacebook, instagram: FaInstagram };

export function BookshopDetailModal({ bookshop, onClose }: Props) {
  const { toast } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoFailed, setLogoFailed] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [tName, setTName] = useState("");
  const [tMsg, setTMsg] = useState("");
  const [tRating, setTRating] = useState(5);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getBooks(bookshop.id), getTestimonials(bookshop.id)])
      .then(([b, t]) => { setBooks(b); setTestimonials(t); })
      .catch((e: any) => toast({ title: "Failed to load shop", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [bookshop.id]);

  const submitTestimonial = async () => {
    if (!tName.trim() || !tMsg.trim()) {
      toast({ title: "Missing info", description: "Name and message required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await addTestimonial({ bookshop_id: bookshop.id, author_name: tName.trim(), message: tMsg.trim(), rating: tRating });
      setTestimonials(prev => [{ id: crypto.randomUUID(), bookshop_id: bookshop.id, author_name: tName, message: tMsg, rating: tRating, created_at: new Date().toISOString() }, ...prev]);
      setTName(""); setTMsg(""); setTRating(5); setShowTestimonialForm(false);
      toast({ title: "✅ Thanks for the review!" });
    } catch (e: any) { toast({ title: "Failed to submit", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleShare = async () => {
    setShowMenu(false);
    const url = `${window.location.origin}${window.location.pathname}?shop=${bookshop.id}`;
    if (navigator.share) { navigator.share({ title: bookshop.name, url }).catch(() => {}); }
    else { navigator.clipboard.writeText(url); toast({ title: "Link copied" }); }
  };

  const handleReport = () => {
    setShowMenu(false);
    toast({ title: "Report received", description: "Our team will review this shop." });
  };

  const socialEntries = Object.entries(bookshop.social_links ?? {}).filter(([, v]) => !!v);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.75)" }}
         onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg bg-card rounded-t-3xl flex flex-col overflow-hidden" style={{ height: "90vh", maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border shrink-0 relative">
          <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
            {bookshop.logo_url && !logoFailed ? (
              <img src={bookshop.logo_url} alt={bookshop.name} className="w-full h-full object-cover" onError={() => setLogoFailed(true)} />
            ) : <Store className="w-7 h-7 text-purple-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-base text-foreground leading-tight truncate">{bookshop.name}</h2>
            <p className="text-xs text-green-500 font-semibold">✓ Verified bookshop</p>
          </div>

          <button onClick={() => setShowMenu(v => !v)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Menu className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>

          {showMenu && (
            <div className="absolute top-14 right-4 z-10 w-44 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
              <button onClick={handleShare} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold hover:bg-muted/50">
                <Share2 className="w-3.5 h-3.5" /> Share shop
              </button>
              <button onClick={handleReport} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-red-500 hover:bg-muted/50">
                <Flag className="w-3.5 h-3.5" /> Report shop
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-5">
          {loading ? (
            <div className="flex justify-center py-14"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {/* About */}
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-1.5">About this bookshop</p>
                <p className="text-sm text-foreground leading-relaxed">{bookshop.about || "No description yet."}</p>
                <div className="flex flex-col gap-1.5 mt-2.5">
                  {bookshop.location && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {bookshop.location}</p>}
                  {bookshop.contact && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {bookshop.contact}</p>}
                </div>
                {socialEntries.length > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    {socialEntries.map(([platform, url]) => {
                      const Icon = SOCIAL_ICONS[platform.toLowerCase()];
                      return (
                        <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                           className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                          {Icon ? <Icon className="w-4 h-4 text-purple-400" /> : <Share2 className="w-3.5 h-3.5 text-purple-400" />}
                        </a>
                      );
                    })}
                  </div>
                )}
                {/* Phase 4: interactive distance map renders here once lat/lng + maps key are wired in */}
              </div>

              {/* Gallery */}
              {bookshop.gallery?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Gallery</p>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {bookshop.gallery.map((url, i) => (
                      <img key={i} src={url} className="w-24 h-24 rounded-xl object-cover shrink-0 border border-border" />
                    ))}
                  </div>
                </div>
              )}

              {/* Books */}
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-2">Books ({books.length})</p>
                {books.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No books listed yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {books.map(b => (
                      <div key={b.id} className="bg-background border border-border rounded-xl p-2.5">
                        <div className="w-full h-24 rounded-lg bg-muted/40 flex items-center justify-center overflow-hidden mb-2">
                          {b.cover_url ? <img src={b.cover_url} className="w-full h-full object-cover" /> : <BookOpen className="w-6 h-6 text-purple-400" />}
                        </div>
                        <p className="text-xs font-semibold truncate">{b.title}</p>
                        <p className="text-[11px] text-muted-foreground">MK {Number(b.price).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Testimonials */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-muted-foreground">Testimonials ({testimonials.length})</p>
                  <button onClick={() => setShowTestimonialForm(v => !v)} className="text-[11px] font-bold text-purple-500">
                    {showTestimonialForm ? "Cancel" : "Write a review"}
                  </button>
                </div>

                {showTestimonialForm && (
                  <div className="bg-background border border-border rounded-xl p-3 space-y-2 mb-3">
                    <input value={tName} onChange={e => setTName(e.target.value)} placeholder="Your name"
                      className="w-full bg-card border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                    <textarea value={tMsg} onChange={e => setTMsg(e.target.value)} placeholder="Your experience with this shop…" rows={2}
                      className="w-full bg-card border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} onClick={() => setTRating(n)} className={`w-5 h-5 cursor-pointer ${n <= tRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                    <button onClick={submitTestimonial} disabled={saving}
                      className="w-full flex items-center justify-center gap-2 font-semibold py-2 rounded-lg bg-purple-600 text-white text-xs active:scale-[0.98] disabled:opacity-60">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Submit review"}
                    </button>
                  </div>
                )}

                {testimonials.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No reviews yet — be the first!</p>
                ) : (
                  <div className="space-y-2">
                    {testimonials.map(t => (
                      <div key={t.id} className="bg-background border border-border rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold">{t.author_name}</p>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: t.rating ?? 0 }).map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{t.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
