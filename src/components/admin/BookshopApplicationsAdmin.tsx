import { useEffect, useState } from "react";
import { Loader2, Check, X as XIcon, ExternalLink, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApplications, reviewApplication, type Bookshop } from "@/lib/bookshops";

export function BookshopApplicationsAdmin() {
  const { toast } = useToast();
  const [apps, setApps] = useState<Bookshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setApps(await getApplications("pending")); }
    catch (e: any) { toast({ title: "Failed to load applications", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handle = async (app: Bookshop, status: "approved" | "rejected") => {
    setBusyId(app.id);
    try {
      await reviewApplication(app, status);
      setApps(prev => prev.filter(a => a.id !== app.id));
      toast({ title: status === "approved" ? `✅ ${app.name} approved` : `${app.name} rejected` });
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setBusyId(null); }
  };

  return (
    <div className="pt-3 space-y-3 pb-4">
      <p className="text-xs font-semibold text-muted-foreground">Pending bookshop applications</p>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : apps.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-10">No pending applications.</p>
      ) : (
        apps.map(app => (
          <div key={app.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-muted/40 flex items-center justify-center shrink-0 overflow-hidden">
                {app.logo_url ? <img src={app.logo_url} className="w-full h-full object-cover" /> : <Store className="w-4 h-4 text-purple-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{app.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{app.location} · {app.contact}</p>
                {app.owner_email && <p className="text-[11px] text-muted-foreground truncate">✉️ {app.owner_email}</p>}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{app.about}</p>
            <a href={app.cert_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-purple-500">
              <ExternalLink className="w-3.5 h-3.5" /> View certificate/registration proof
            </a>
            <div className="flex gap-2 pt-1">
              <button onClick={() => handle(app, "approved")} disabled={busyId === app.id}
                className="flex-1 flex items-center justify-center gap-1.5 font-semibold py-2 rounded-lg bg-green-600 text-white text-xs active:scale-[0.98] disabled:opacity-60">
                {busyId === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Approve</>}
              </button>
              <button onClick={() => handle(app, "rejected")} disabled={busyId === app.id}
                className="flex-1 flex items-center justify-center gap-1.5 font-semibold py-2 rounded-lg bg-red-500/10 text-red-500 text-xs active:scale-[0.98] disabled:opacity-60">
                <XIcon className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
