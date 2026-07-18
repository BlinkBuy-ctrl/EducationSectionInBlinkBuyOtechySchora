import { useEffect, useState } from "react";
import { Loader2, Check, X as XIcon, ExternalLink, Store, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApplications, reviewApplication, deleteBookshop, type Bookshop } from "@/lib/bookshops";

type StatusTab = "pending" | "approved" | "rejected";

export function BookshopApplicationsAdmin() {
  const { toast } = useToast();
  const [statusTab, setStatusTab] = useState<StatusTab>("pending");
  const [apps, setApps] = useState<Bookshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = async (status: StatusTab) => {
    setLoading(true);
    try { setApps(await getApplications(status)); }
    catch (e: any) { toast({ title: "Failed to load applications", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(statusTab); }, [statusTab]);

  const handle = async (app: Bookshop, status: "approved" | "rejected") => {
    setBusyId(app.id);
    try {
      await reviewApplication(app, status);
      setApps(prev => prev.filter(a => a.id !== app.id));
      toast({ title: status === "approved" ? `✅ ${app.name} approved` : `${app.name} rejected` });
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setBusyId(null); }
  };

  const handleDelete = async (app: Bookshop) => {
    setBusyId(app.id);
    try {
      await deleteBookshop(app.id);
      setApps(prev => prev.filter(a => a.id !== app.id));
      setConfirmDeleteId(null);
      toast({ title: `${app.name} deleted` });
    } catch (e: any) { toast({ title: "Delete failed", description: e.message, variant: "destructive" }); }
    finally { setBusyId(null); }
  };

  return (
    <div className="pt-3 space-y-3 pb-4">
      <div className="flex gap-1.5">
        {(["pending", "approved", "rejected"] as StatusTab[]).map(s => (
          <button
            key={s}
            onClick={() => setStatusTab(s)}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg capitalize transition-colors ${
              statusTab === s ? "bg-purple-600 text-white" : "bg-card border border-border text-muted-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : apps.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-10">No {statusTab} bookshops.</p>
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
              {statusTab === "pending" && (
                <>
                  <button onClick={() => handle(app, "approved")} disabled={busyId === app.id}
                    className="flex-1 flex items-center justify-center gap-1.5 font-semibold py-2 rounded-lg bg-green-600 text-white text-xs active:scale-[0.98] disabled:opacity-60">
                    {busyId === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Approve</>}
                  </button>
                  <button onClick={() => handle(app, "rejected")} disabled={busyId === app.id}
                    className="flex-1 flex items-center justify-center gap-1.5 font-semibold py-2 rounded-lg bg-red-500/10 text-red-500 text-xs active:scale-[0.98] disabled:opacity-60">
                    <XIcon className="w-3.5 h-3.5" /> Reject
                  </button>
                </>
              )}

              {confirmDeleteId === app.id ? (
                <>
                  <button onClick={() => handleDelete(app)} disabled={busyId === app.id}
                    className="flex-1 flex items-center justify-center gap-1.5 font-semibold py-2 rounded-lg bg-red-600 text-white text-xs active:scale-[0.98] disabled:opacity-60">
                    {busyId === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm delete"}
                  </button>
                  <button onClick={() => setConfirmDeleteId(null)}
                    className="flex-1 text-xs font-semibold py-2 rounded-lg border border-border text-muted-foreground">
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setConfirmDeleteId(app.id)}
                  className={`${statusTab === "pending" ? "w-9" : "flex-1"} flex items-center justify-center gap-1.5 font-semibold py-2 rounded-lg border border-red-500/30 text-red-500 text-xs active:scale-[0.98]`}>
                  <Trash2 className="w-3.5 h-3.5" /> {statusTab !== "pending" && "Delete"}
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
