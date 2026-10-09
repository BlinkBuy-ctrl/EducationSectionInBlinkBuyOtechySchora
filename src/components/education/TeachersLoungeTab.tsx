// ============================================================
// Teachers Lounge — a tab for teachers' material (lesson plans, schemes of
// work, zipped bundles, books…).
//
// Backend: the PRIMARY resources Supabase project — the same `otechy_resources`
// table and `otechy-docs` bucket that Primary books already use. Teachers
// Lounge uploads are simply rows with section = 'teachers' (see
// primary_teachers_lounge.sql). Subject is still kept on every row, so a
// teacher's Mathematics scheme of work is in BOTH Teachers Lounge and Maths.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, Upload, Wrench } from "lucide-react";
import { primaryResourcesSupabase } from "@/lib/primaryResourcesSupabase";
import { SUBJECTS_BY_LEVEL, TEACHERS_SECTION } from "@/lib/resourceLevels";
import { smartFilter } from "@/lib/smartSearch";
import { getValue, setValue } from "@/lib/offlineCache";
import { useToast } from "@/hooks/use-toast";
import { ResourceCard } from "@/components/education/ResourceCard";
import { ResourceDetailModal } from "@/components/education/ResourceDetailModal";

const TABLE = "otechy_resources";
const CACHE_KEY = "teachers_resources";

interface Props {
  userId: string;
  /** Download handler from the page, already bound to the Primary backend. */
  onDownload: (resource: any) => void;
  onUploadClick: () => void;
  ensureProfile: () => Promise<unknown>;
}

export function TeachersLoungeTab({ userId, onDownload, onUploadClick, ensureProfile }: Props) {
  const { toast } = useToast();
  const [items,      setItems]      = useState<any[]>([]);
  const [bookmarks,  setBookmarks]  = useState<Set<string>>(new Set());
  const [loading,    setLoading]    = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [search,     setSearch]     = useState("");
  const [subject,    setSubject]    = useState("All");
  const [detail,     setDetail]     = useState<any>(null);

  const load = useCallback(async () => {
    const { data, error } = await primaryResourcesSupabase
      .from(TABLE).select("*")
      .eq("section", TEACHERS_SECTION)
      .order("created_at", { ascending: false });

    if (error) {
      // 42703 = the `section` column doesn't exist yet (SQL not run).
      if (error.code === "42703" || /section/i.test(error.message ?? "")) setSetupNeeded(true);
      else if (navigator.onLine) toast({ title: "Couldn't load Teachers Lounge", description: error.message, variant: "destructive" });
      return;
    }
    setSetupNeeded(false);
    const rows = data ?? [];
    setItems(rows);
    setValue(CACHE_KEY, rows).catch(() => {});

    const { data: bm } = await primaryResourcesSupabase
      .from("otechy_bookmarks").select("resource_id").eq("user_id", userId);
    if (bm) setBookmarks(new Set(bm.map((b: any) => b.resource_id)));
  }, [userId, toast]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const cached = await getValue<any[]>(CACHE_KEY).catch(() => null);   // instant, works offline
      if (alive && cached && cached.length) { setItems(cached); setLoading(false); }
      await load();
      if (alive) setLoading(false);
    })();
    // refresh after an upload, and when the header refresh button is pressed
    const refresh = () => { load(); };
    window.addEventListener("otechy:teachers-refresh", refresh);
    window.addEventListener("otechy:refresh-content", refresh);
    return () => {
      alive = false;
      window.removeEventListener("otechy:teachers-refresh", refresh);
      window.removeEventListener("otechy:refresh-content", refresh);
    };
  }, [load]);

  const filtered = useMemo(() => smartFilter(items, search, (r: any) => [
    { text: r.title,       weight: 3 },
    { text: r.subject,     weight: 2 },
    { text: r.category,    weight: 2 },
    { text: r.description, weight: 1 },
    { text: r.file_name,   weight: 1 },
  ]).filter((r: any) => subject === "All" || r.subject === subject), [items, search, subject]);

  const toggleBookmark = async (r: any) => {
    await ensureProfile();
    const has = bookmarks.has(r.id);
    try {
      if (has) {
        await primaryResourcesSupabase.from("otechy_bookmarks").delete().eq("user_id", userId).eq("resource_id", r.id);
        setBookmarks(p => { const n = new Set(p); n.delete(r.id); return n; });
      } else {
        await primaryResourcesSupabase.from("otechy_bookmarks").insert({ user_id: userId, resource_id: r.id });
        setBookmarks(p => new Set([...p, r.id]));
      }
    } catch (e: any) { toast({ title: "Couldn't update bookmark", description: e.message, variant: "destructive" }); }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-3 rounded-2xl bg-gradient-to-r from-sky-600/15 to-blue-600/15 border border-sky-500/20 p-3.5 flex items-center gap-3">
        <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-xl shadow">🧑‍🏫</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold leading-tight">Teachers Lounge</p>
          <p className="text-[11px] text-muted-foreground leading-snug">Lesson plans, schemes of work, books and zip bundles — shared by teachers, for teachers.</p>
        </div>
        <button onClick={onUploadClick}
          className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white active:scale-95 transition-transform shadow">
          <Upload className="w-3.5 h-3.5" /> Upload
        </button>
      </div>

      {setupNeeded ? (
        <div className="flex flex-col items-center text-center gap-2 py-12 px-6">
          <Wrench className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm font-bold">Teachers Lounge is almost ready</p>
          <p className="text-xs text-muted-foreground">It's being set up. Please check back soon.</p>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search lesson plans, schemes of work…"
              className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50" />
          </div>

          {/* Subject filter */}
          <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
            {["All", ...SUBJECTS_BY_LEVEL.Primary].map(s => (
              <button key={s} onClick={() => setSubject(s)}
                className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${subject === s ? "bg-sky-600 border-sky-600 text-white" : "border-border text-muted-foreground"}`}>
                {s === "All" ? "All Subjects" : s}
              </button>
            ))}
          </div>

          {loading && items.length === 0 ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center text-center gap-2 py-12 px-6">
              <span className="text-4xl">📂</span>
              <p className="text-sm font-bold">{items.length === 0 ? "Nothing here yet" : "No matches"}</p>
              <p className="text-xs text-muted-foreground">
                {items.length === 0 ? "Be the first teacher to share something." : "Try a different search or subject."}
              </p>
              {items.length === 0 && (
                <button onClick={onUploadClick} className="mt-2 text-xs font-bold px-4 py-2 rounded-xl bg-sky-600 text-white active:scale-95 transition-transform">
                  Upload to Teachers Lounge
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((r: any) => (
                <ResourceCard key={r.id} resource={r} isPurchased={false}
                  onBuy={() => {}} onDownload={onDownload} onOpen={setDetail}
                  client={primaryResourcesSupabase} level="Primary" />
              ))}
            </div>
          )}
        </>
      )}

      {detail && (
        <ResourceDetailModal
          resource={detail}
          isPurchased={false}
          isBookmarked={bookmarks.has(detail.id)}
          onClose={() => setDetail(null)}
          onBuy={() => {}}
          onDownload={onDownload}
          onBookmarkToggle={toggleBookmark}
          allResources={items}
          onOpenSimilar={setDetail}
          client={primaryResourcesSupabase}
          level="Primary"
        />
      )}
    </div>
  );
}
