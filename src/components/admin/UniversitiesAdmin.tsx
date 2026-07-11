import { useEffect, useRef, useState } from "react";
import {
  Loader2, Trash2, PlusCircle, School, ChevronDown, ChevronUp,
  Upload, Link2, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  createUniversity, getUniversities, deleteUniversity,
  createUniversityLink, getUniversityLinks, deleteUniversityLink,
  type University, type UniversityLink,
} from "@/lib/universities";

const EMPTY_UNI_DRAFT = { name: "" };
const EMPTY_LINK_DRAFT = { platform_type: "", url: "", description: "" };

// ── Links manager for one expanded university ──────────────────────
function UniversityLinksManager({ university }: { university: University }) {
  const { toast } = useToast();
  const [links, setLinks] = useState<UniversityLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(EMPTY_LINK_DRAFT);

  const load = async () => {
    setLoading(true);
    try {
      setLinks(await getUniversityLinks(university.id));
    } catch (e: any) {
      toast({ title: "Failed to load links", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [university.id]);

  const handleAddLink = async () => {
    const platform_type = draft.platform_type.trim();
    const url = draft.url.trim();
    if (!platform_type || !url) {
      toast({ title: "Missing info", description: "Platform and link are both required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const link = await createUniversityLink({
        university_id: university.id,
        platform_type,
        url,
        description: draft.description.trim(),
        sort_order: links.length,
      });
      setLinks(prev => [...prev, link]);
      setDraft(EMPTY_LINK_DRAFT);
      toast({ title: `✅ Link added to ${university.name}` });
    } catch (e: any) {
      toast({ title: "Failed to add link", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLink = async (link: UniversityLink) => {
    if (!confirm(`Delete the "${link.platform_type}" link?`)) return;
    try {
      await deleteUniversityLink(link.id);
      setLinks(prev => prev.filter(l => l.id !== link.id));
      toast({ title: "Deleted" });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {/* Add link */}
      <div className="space-y-2">
        <input
          value={draft.platform_type}
          onChange={e => setDraft(p => ({ ...p, platform_type: e.target.value }))}
          placeholder="Platform (e.g. WhatsApp, Facebook, Transport)"
          className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
        <input
          value={draft.url}
          onChange={e => setDraft(p => ({ ...p, url: e.target.value }))}
          placeholder="Link URL (https://…)"
          className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
        <input
          value={draft.description}
          onChange={e => setDraft(p => ({ ...p, description: e.target.value }))}
          placeholder="Short description (optional)"
          className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
        <button
          onClick={handleAddLink}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 font-semibold py-2 rounded-lg bg-purple-600 text-white text-xs active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><PlusCircle className="w-3.5 h-3.5" /> Add link</>}
        </button>
      </div>

      {/* Existing links */}
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : links.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-4">No links posted yet.</p>
      ) : (
        <div className="space-y-1.5">
          {links.map(link => (
            <div key={link.id} className="flex items-center gap-2 bg-background border border-border rounded-lg px-2.5 py-2">
              <Link2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{link.platform_type}</p>
                <p className="text-[10px] text-muted-foreground truncate">{link.url}</p>
              </div>
              <button onClick={() => handleDeleteLink(link)} className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────
export function UniversitiesAdmin() {
  const { toast } = useToast();
  const logoRef = useRef<HTMLInputElement>(null);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(EMPTY_UNI_DRAFT);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  };

  const handleAdd = async () => {
    const name = draft.name.trim();
    if (!name) {
      toast({ title: "Name required", description: "Enter the university's full name.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const uni = await createUniversity({ name, logoFile });
      setUniversities(prev => [...prev, uni].sort((a, b) => a.name.localeCompare(b.name)));
      setDraft(EMPTY_UNI_DRAFT);
      setLogoFile(null);
      setLogoPreview(null);
      toast({ title: `✅ ${name} created — check the Higher Education tab` });
    } catch (e: any) {
      toast({ title: "Failed to create university", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (uni: University) => {
    if (!confirm(`Permanently delete "${uni.name}" and all its links? This cannot be undone.`)) return;
    try {
      await deleteUniversity(uni.id);
      setUniversities(prev => prev.filter(u => u.id !== uni.id));
      if (expandedId === uni.id) setExpandedId(null);
      toast({ title: "Deleted" });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="pt-3 space-y-4 pb-4">
      {/* Add new university */}
      <div className="bg-card border border-border rounded-xl p-3 space-y-2.5">
        <p className="text-xs font-semibold text-muted-foreground">Add a new university</p>

        <div
          onClick={() => logoRef.current?.click()}
          className="relative h-24 rounded-xl border-2 border-dashed border-border hover:border-purple-500/50 cursor-pointer overflow-hidden transition-colors flex items-center justify-center"
        >
          {logoPreview ? (
            <img src={logoPreview} alt="" className="w-full h-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
              <Upload className="w-5 h-5" />
              <span className="text-[11px]">Upload logo (optional)</span>
            </div>
          )}
          <input ref={logoRef} type="file" accept="image/*" onChange={handleLogo} className="hidden" />
        </div>

        <input
          value={draft.name}
          onChange={e => setDraft({ name: e.target.value })}
          placeholder="University name (e.g. LUANAR)"
          className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />

        <button
          onClick={handleAdd}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 font-semibold py-2.5 rounded-xl bg-purple-600 text-white active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><PlusCircle className="w-4 h-4" /> Create university</>}
        </button>
      </div>

      {/* Existing universities */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Existing universities</p>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : universities.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-10">No universities yet.</p>
        ) : (
          <div className="space-y-2">
            {universities.map(uni => {
              const expanded = expandedId === uni.id;
              return (
                <div key={uni.id} className="bg-card border border-border rounded-xl p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
                      {uni.logo_url ? <img src={uni.logo_url} alt={uni.name} className="w-full h-full object-cover" /> : <School className="w-4 h-4 text-purple-400" />}
                    </div>
                    <p className="flex-1 min-w-0 text-sm font-semibold truncate">{uni.name}</p>
                    <button onClick={() => handleDelete(uni)} className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                    <button
                      onClick={() => setExpandedId(expanded ? null : uni.id)}
                      className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0"
                    >
                      {expanded ? <ChevronUp className="w-3.5 h-3.5 text-purple-400" /> : <ChevronDown className="w-3.5 h-3.5 text-purple-400" />}
                    </button>
                  </div>

                  {expanded && <UniversityLinksManager university={uni} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
