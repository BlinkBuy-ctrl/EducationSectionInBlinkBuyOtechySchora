import { useEffect, useState } from "react";
import { Loader2, Trash2, EyeOff, Eye, PlusCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

type AdvertRow = {
  id: string;
  mux_playback_id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  like_count: number;
  dislike_count: number;
  created_at: string;
};

const EMPTY_DRAFT = { mux_playback_id: "", title: "", description: "" };

export function AdvertsAdmin() {
  const { toast } = useToast();
  const [rows, setRows] = useState<AdvertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("otechy_reels")
      .select("id,mux_playback_id,title,description,is_active,like_count,dislike_count,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load adverts", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows((data || []) as AdvertRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const playbackId = draft.mux_playback_id.trim();
    const title = draft.title.trim();
    if (!playbackId || !title) {
      toast({ title: "Missing info", description: "Playback ID and title are both required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("otechy_reels")
      .insert({
        mux_playback_id: playbackId,
        title,
        description: draft.description.trim() || null,
      })
      .select()
      .single();
    setSaving(false);

    if (error) {
      toast({ title: "Failed to add advert", description: error.message, variant: "destructive" });
      return;
    }
    setRows(prev => [data as AdvertRow, ...prev]);
    setDraft(EMPTY_DRAFT);
    toast({ title: "✅ Advert added — check the Adverts tab" });
  };

  const toggleActive = async (row: AdvertRow) => {
    const next = !row.is_active;
    const { error } = await supabase.from("otechy_reels").update({ is_active: next }).eq("id", row.id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, is_active: next } : r));
  };

  const handleDelete = async (row: AdvertRow) => {
    if (!confirm(`Permanently delete "${row.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("otechy_reels").delete().eq("id", row.id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    setRows(prev => prev.filter(r => r.id !== row.id));
    toast({ title: "Deleted" });
  };

  return (
    <div className="pt-3 space-y-4 pb-4">
      {/* Add new advert */}
      <div className="bg-card border border-border rounded-xl p-3 space-y-2.5">
        <p className="text-xs font-semibold text-muted-foreground">Add a new advert</p>

        <div>
          <p className="text-[11px] text-muted-foreground mb-1">Mux Playback ID</p>
          <input
            value={draft.mux_playback_id}
            onChange={e => setDraft(p => ({ ...p, mux_playback_id: e.target.value }))}
            placeholder="e.g. AbC123XyZ…"
            className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        <div>
          <p className="text-[11px] text-muted-foreground mb-1">Title</p>
          <input
            value={draft.title}
            onChange={e => setDraft(p => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Chanco Open Day 2026"
            className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        <div>
          <p className="text-[11px] text-muted-foreground mb-1">Description (optional)</p>
          <textarea
            value={draft.description}
            onChange={e => setDraft(p => ({ ...p, description: e.target.value }))}
            rows={2}
            placeholder="Short caption shown under the advert…"
            className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
          />
        </div>

        <button
          onClick={handleAdd}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 font-semibold py-2.5 rounded-xl bg-blue-600 text-white active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><PlusCircle className="w-4 h-4" /> Add advert</>}
        </button>
      </div>

      {/* Existing adverts */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Existing adverts</p>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-10">No adverts yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map(row => (
              <div key={row.id} className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{row.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">ID: {row.mux_playback_id}</p>
                  </div>
                  <button onClick={() => handleDelete(row)} className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2.5">
                  <p className="text-[11px] text-muted-foreground">👍 {row.like_count} · 👎 {row.dislike_count}</p>
                  <button
                    onClick={() => toggleActive(row)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                      row.is_active ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-border text-muted-foreground"
                    }`}
                  >
                    {row.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {row.is_active ? "Live" : "Hidden"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
