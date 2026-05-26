import { useState, useEffect } from "react";
import {
  TrendingUp, Download, Star, DollarSign,
  FileText, Eye, Loader2, BadgeCheck, Trash2, AlertTriangle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface Props { userId: string; onRefresh: () => void; }

export function SellerDashboard({ userId, onRefresh }: Props) {
  const { toast } = useToast();
  const [stats,    setStats]    = useState<any>(null);
  const [myItems,  setMyItems]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, itemsRes] = await Promise.all([
        supabase.rpc("get_seller_stats", { p_user_id: userId }),
        supabase
          .from("otechy_resources")
          .select("id,title,category,price,download_count,avg_rating,review_count,created_at,file_url")
          .eq("uploader_id", userId)
          .order("created_at", { ascending: false }),
      ]);
      if (statsRes.data) setStats(statsRes.data);
      if (itemsRes.data) setMyItems(itemsRes.data);
    } catch (e: any) {
      toast({ title: "Failed to load dashboard", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [userId]);

  const handleDelete = async (item: any) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setDeleting(item.id);
    try {
      // Delete storage file
      await supabase.storage.from("otechy-docs").remove([item.file_url]);
      // Delete DB record (cascades to ratings, purchases, download_logs)
      const { error } = await supabase.from("otechy_resources").delete().eq("id", item.id);
      if (error) throw error;
      toast({ title: "Deleted", description: `"${item.title}" removed.` });
      load();
      onRefresh();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally { setDeleting(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
    </div>
  );

  const statCards = [
    { icon: FileText,   label: "Resources",  value: stats?.total_resources ?? 0,  color: "from-purple-500 to-blue-600" },
    { icon: Download,   label: "Downloads",  value: stats?.total_downloads ?? 0,  color: "from-blue-500 to-cyan-500"   },
    { icon: DollarSign, label: "Earnings",   value: `MK ${Number(stats?.total_earnings ?? 0).toLocaleString()}`, color: "from-green-500 to-emerald-500" },
    { icon: Star,       label: "Avg Rating", value: stats?.avg_rating > 0 ? `${Number(stats.avg_rating).toFixed(1)} ★` : "—", color: "from-yellow-500 to-orange-500" },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0 shadow-sm`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
              <p className="text-base font-black text-foreground truncate">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* My uploads */}
      <div>
        <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-3">My Uploads ({myItems.length})</p>

        {myItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center bg-muted/20 rounded-2xl">
            <FileText className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No uploads yet.<br />Hit Upload to share your first resource.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {myItems.map(item => (
              <div key={item.id} className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center shrink-0">
                  <FileText className="w-4.5 h-4.5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{item.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                    <span>{item.category}</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Download className="w-3 h-3" />{item.download_count ?? 0}
                    </span>
                    {item.review_count > 0 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{Number(item.avg_rating).toFixed(1)}
                        </span>
                      </>
                    )}
                    <span className="ml-auto font-semibold text-foreground">
                      {Number(item.price) === 0 ? "Free" : `MK ${Number(item.price).toLocaleString()}`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item)}
                  disabled={deleting === item.id}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 shrink-0"
                >
                  {deleting === item.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2.5">
        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-yellow-600 dark:text-yellow-400 leading-relaxed">
          Earnings shown are recorded purchases. Physical payouts are processed manually by the OtechySchora team — contact us to request a withdrawal.
        </p>
      </div>
    </div>
  );
}
