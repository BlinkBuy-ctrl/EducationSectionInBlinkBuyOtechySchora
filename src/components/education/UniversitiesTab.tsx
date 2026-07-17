import { useEffect, useMemo, useState } from "react";
import { Building2, Link2, Loader2, School } from "lucide-react";
import { getUniversities, type University } from "@/lib/universities";
import { AnimatedSearchInput } from "@/components/education/AnimatedSearchInput";
import { UniversityDetailModal } from "@/components/education/UniversityDetailModal";
import { useToast } from "@/hooks/use-toast";

const UNI_SEARCH_PHRASES = [
  "Search LUANAR…",
  "Search Chanco…",
  "Search Kuhes…",
  "Search Mzuni…",
  "Search your university…",
];

function UniversityCard({ u, onOpen }: { u: University; onOpen: (u: University) => void }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showLogo = !!u.logo_url && !imgFailed;

  return (
    <div
      onClick={() => onOpen(u)}
      className="flex flex-col items-center gap-2 bg-card border border-border rounded-2xl p-4 active:scale-[0.97] transition-all cursor-pointer"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
    >
      <div className="w-16 h-16 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
        {showLogo ? (
          <img src={u.logo_url!} alt={u.name} className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
        ) : (
          <School className="w-7 h-7 text-purple-400" />
        )}
      </div>
      <p className="text-xs font-bold text-foreground text-center line-clamp-2 leading-snug">{u.name}</p>
    </div>
  );
}

export function UniversitiesTab() {
  const { toast } = useToast();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<University | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setUniversities(await getUniversities());
    } catch (e: any) {
      toast({ title: "Failed to load universities", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = universities.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
  const suggestionPool = useMemo(() => universities.map(u => u.name), [universities]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{universities.length} universit{universities.length !== 1 ? "ies" : "y"}</p>
      </div>

      <AnimatedSearchInput
        value={search}
        onChange={setSearch}
        phrases={UNI_SEARCH_PHRASES}
        ringColorClass="focus:ring-purple-500/50"
        ariaLabel="Search universities"
        suggestionPool={suggestionPool}
      />

      {loading ? (
        <div className="flex justify-center py-14"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : universities.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-purple-400" />
          </div>
          <p className="font-semibold text-foreground">No universities yet</p>
          <p className="text-sm text-muted-foreground">Our team is adding universities soon — check back!</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-purple-400" />
          </div>
          <p className="font-semibold text-foreground">No universities match</p>
          <p className="text-sm text-muted-foreground">Try a different search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(u => <UniversityCard key={u.id} u={u} onOpen={setSelected} />)}
        </div>
      )}

      {/* Add-link CTA */}
      <a
        href="https://wa.me/265999626944"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 text-xs font-bold text-purple-500 active:scale-[0.98] transition-all py-2"
      >
        <Link2 className="w-3.5 h-3.5" /> Want To Help Add Link? Click Here
      </a>

      {selected && <UniversityDetailModal university={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
