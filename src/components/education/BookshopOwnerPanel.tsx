import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Store, Upload, Trash2, PlusCircle, LogOut, MapPin } from "lucide-react";
import {
  signUpOwner, signInOwner, signOutOwner, getOwnerSession, claimMyBookshop,
  getMyBookshop, ownerUpdateShop, ownerDeleteShop, ownerUploadAsset,
  getBooks, ownerAddBook, ownerDeleteBook, type Bookshop, type Book,
} from "@/lib/bookshops";
import { useToast } from "@/hooks/use-toast";

interface Props { onClose: () => void; }

export function BookshopOwnerPanel({ onClose }: Props) {
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [shop, setShop] = useState<Bookshop | null>(null);

  // auth form
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const bootstrap = async () => {
    setChecking(true);
    const session = await getOwnerSession();
    if (!session) { setLoggedIn(false); setChecking(false); return; }
    setLoggedIn(true);
    try {
      let mine = await getMyBookshop(session.user.id);
      if (!mine) mine = await claimMyBookshop().catch(() => null);
      setShop(mine);
    } finally { setChecking(false); }
  };

  useEffect(() => { bootstrap(); }, []);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      toast({ title: "Email and password required", variant: "destructive" });
      return;
    }
    setAuthBusy(true);
    try {
      if (mode === "signup") {
        await signUpOwner(email.trim(), password);
        toast({ title: "Check your email", description: "Confirm your account, then sign in here." });
        setMode("signin");
      } else {
        await signInOwner(email.trim(), password);
        await bootstrap();
      }
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setAuthBusy(false); }
  };

  const handleLogout = async () => {
    await signOutOwner();
    setLoggedIn(false); setShop(null);
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.75)" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg bg-card rounded-t-3xl flex flex-col overflow-hidden" style={{ height: "90vh", maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border shrink-0">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center"><Store className="w-5 h-5 text-purple-400" /></div>
          <div className="flex-1"><h2 className="font-black text-base">My Bookshop</h2></div>
          {loggedIn && (
            <button onClick={handleLogout} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          )}
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {checking ? (
            <div className="flex justify-center py-14"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : !loggedIn ? (
            <div className="space-y-2.5 max-w-sm mx-auto pt-6">
              <p className="text-xs text-muted-foreground text-center mb-3">
                {mode === "signin"
                  ? "Sign in with the email + password you created after approval."
                  : "No one sends you a password — you create it yourself, right here, using the same email you applied with."}
              </p>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email"
                className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
              <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password"
                className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
              <button onClick={handleAuth} disabled={authBusy}
                className="w-full flex items-center justify-center gap-2 font-semibold py-2.5 rounded-xl bg-purple-600 text-white active:scale-[0.98] disabled:opacity-60">
                {authBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Sign up"}
              </button>
              <button onClick={() => setMode(m => m === "signin" ? "signup" : "signin")} className="w-full text-xs font-semibold text-purple-500 py-1">
                {mode === "signin" ? "First time? Create a login" : "Already have a login? Sign in"}
              </button>
            </div>
          ) : !shop ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <p className="font-semibold">No approved shop found for this account yet.</p>
              <p className="text-xs text-muted-foreground">Either your application is still pending, or use the same email you applied with.</p>
            </div>
          ) : shop.status !== "approved" ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <p className="font-semibold capitalize">Application {shop.status}</p>
              <p className="text-xs text-muted-foreground">
                {shop.status === "pending" ? "We'll email/notify you once it's reviewed." : "Contact support if you think this is a mistake."}
              </p>
            </div>
          ) : (
            <OwnerDashboard shop={shop} onShopChange={setShop} onClose={onClose} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function OwnerDashboard({ shop, onShopChange, onClose }: { shop: Bookshop; onShopChange: (s: Bookshop) => void; onClose: () => void }) {
  const { toast } = useToast();
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [motto, setMotto] = useState(shop.motto ?? "");
  const [about, setAbout] = useState(shop.about ?? "");
  const [location, setLocation] = useState(shop.location ?? "");
  const [contact, setContact] = useState(shop.contact ?? "");
  const [brandColor, setBrandColor] = useState(shop.brand_color ?? "#7c3aed");
  const [categories, setCategories] = useState((shop.categories ?? []).join(", "));
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: shop.lat, lng: shop.lng });
  const [locatingGPS, setLocatingGPS] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [newBook, setNewBook] = useState({ title: "", author: "", price: "", stock: "" });
  const [addingBook, setAddingBook] = useState(false);

  useEffect(() => { getBooks(shop.id).then(setBooks).finally(() => setLoadingBooks(false)); }, [shop.id]);

  const saveDetails = async () => {
    setSaving(true);
    try {
      const categoryList = categories.split(",").map(c => c.trim()).filter(Boolean);
      await ownerUpdateShop(shop.id, { motto, about, location, contact, brand_color: brandColor, categories: categoryList, lat: coords.lat, lng: coords.lng });
      onShopChange({ ...shop, motto, about, location, contact, brand_color: brandColor, categories: categoryList, lat: coords.lat, lng: coords.lng });
      toast({ title: "✅ Saved" });
    } catch (e: any) { toast({ title: "Failed to save", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocatingGPS(false); },
      () => { toast({ title: "Couldn't get your location", description: "Check location permission and try again.", variant: "destructive" }); setLocatingGPS(false); }
    );
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadingLogo(true);
    try {
      const url = await ownerUploadAsset(f, "logos");
      await ownerUpdateShop(shop.id, { logo_url: url });
      onShopChange({ ...shop, logo_url: url });
      toast({ title: "✅ Logo updated" });
    } catch (e: any) { toast({ title: "Upload failed", description: e.message, variant: "destructive" }); }
    finally { setUploadingLogo(false); }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadingBanner(true);
    try {
      const url = await ownerUploadAsset(f, "banners");
      await ownerUpdateShop(shop.id, { banner_url: url });
      onShopChange({ ...shop, banner_url: url });
      toast({ title: "✅ Banner updated" });
    } catch (e: any) { toast({ title: "Upload failed", description: e.message, variant: "destructive" }); }
    finally { setUploadingBanner(false); }
  };

  const handleAddBook = async () => {
    const price = Number(newBook.price), stock = Number(newBook.stock);
    if (!newBook.title.trim() || isNaN(price)) {
      toast({ title: "Title and a valid price are required", variant: "destructive" });
      return;
    }
    setAddingBook(true);
    try {
      await ownerAddBook(shop.id, { title: newBook.title.trim(), author: newBook.author.trim(), price, stock: isNaN(stock) ? 0 : stock, cover_url: null });
      setBooks(await getBooks(shop.id));
      setNewBook({ title: "", author: "", price: "", stock: "" });
      toast({ title: "✅ Book added" });
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setAddingBook(false); }
  };

  const handleDeleteBook = async (bookId: string) => {
    try { await ownerDeleteBook(shop.id, bookId); setBooks(prev => prev.filter(b => b.id !== bookId)); }
    catch (e: any) { toast({ title: "Delete failed", description: e.message, variant: "destructive" }); }
  };

  const handleDeleteShop = async () => {
    try {
      await ownerDeleteShop(shop.id);
      toast({ title: "Shop deleted" });
      onClose();
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-5">
      {/* Branding */}
      <div>
        <p className="text-xs font-bold text-muted-foreground mb-2">Branding</p>
        <div className="flex gap-2">
          <div onClick={() => logoRef.current?.click()} className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer shrink-0">
            {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : shop.logo_url ? <img src={shop.logo_url} className="w-full h-full object-cover" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </div>
          <div onClick={() => bannerRef.current?.click()} className="flex-1 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer">
            {uploadingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : shop.banner_url ? <img src={shop.banner_url} className="w-full h-full object-cover" /> : <p className="text-xs text-muted-foreground">Upload banner</p>}
            <input ref={bannerRef} type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2">
        <input value={motto} onChange={e => setMotto(e.target.value)} placeholder="Motto (e.g. Books for developers, students & dreamers)"
          className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
        <textarea value={about} onChange={e => setAbout(e.target.value)} placeholder="About your shop" rows={3}
          className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location"
          className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
        <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Contact"
          className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
        <input value={categories} onChange={e => setCategories(e.target.value)} placeholder="Categories, comma separated (e.g. Fiction, Textbooks, Kids)"
          className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
        <button onClick={useMyLocation} disabled={locatingGPS}
          className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2 rounded-lg border border-border text-muted-foreground">
          {locatingGPS ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
          {coords.lat != null ? "Update map pin to my current location" : "Set shop location on the map (uses your GPS)"}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Brand color</span>
          <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-9 h-9 rounded-lg border border-border" />
        </div>
        <button onClick={saveDetails} disabled={saving}
          className="w-full flex items-center justify-center gap-2 font-semibold py-2.5 rounded-xl bg-purple-600 text-white active:scale-[0.98] disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save details"}
        </button>
      </div>

      {/* Books */}
      <div>
        <p className="text-xs font-bold text-muted-foreground mb-2">Books ({books.length})</p>
        <div className="bg-background border border-border rounded-xl p-3 space-y-2 mb-3">
          <input value={newBook.title} onChange={e => setNewBook(b => ({ ...b, title: e.target.value }))} placeholder="Title"
            className="w-full bg-card border border-border rounded-lg px-2.5 py-2 text-sm" />
          <div className="flex gap-2">
            <input value={newBook.author} onChange={e => setNewBook(b => ({ ...b, author: e.target.value }))} placeholder="Author"
              className="flex-1 bg-card border border-border rounded-lg px-2.5 py-2 text-sm" />
            <input value={newBook.price} onChange={e => setNewBook(b => ({ ...b, price: e.target.value }))} placeholder="Price (MK)" type="number"
              className="w-24 bg-card border border-border rounded-lg px-2.5 py-2 text-sm" />
            <input value={newBook.stock} onChange={e => setNewBook(b => ({ ...b, stock: e.target.value }))} placeholder="Stock" type="number"
              className="w-20 bg-card border border-border rounded-lg px-2.5 py-2 text-sm" />
          </div>
          <button onClick={handleAddBook} disabled={addingBook}
            className="w-full flex items-center justify-center gap-2 font-semibold py-2 rounded-lg bg-purple-600 text-white text-xs active:scale-[0.98] disabled:opacity-60">
            {addingBook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><PlusCircle className="w-3.5 h-3.5" /> Add book</>}
          </button>
        </div>

        {loadingBooks ? (
          <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-1.5">
            {books.map(b => (
              <div key={b.id} className="flex items-center gap-2 bg-background border border-border rounded-lg px-2.5 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{b.title}</p>
                  <p className="text-[10px] text-muted-foreground">MK {Number(b.price).toLocaleString()} · {b.stock} in stock</p>
                </div>
                <button onClick={() => handleDeleteBook(b.id)} className="w-7 h-7 rounded-md bg-red-500/10 flex items-center justify-center shrink-0">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="pt-3 border-t border-border">
        {confirmDelete ? (
          <div className="flex gap-2">
            <button onClick={handleDeleteShop} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold">Confirm delete shop</button>
            <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-500 text-sm font-semibold">
            Delete my shop
          </button>
        )}
      </div>
    </div>
  );
}
