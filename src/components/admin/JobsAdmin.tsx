import { useEffect, useRef, useState } from "react";
import {
  Loader2, PlusCircle, Briefcase, X, Upload, Link2, ShieldCheck,
  ShieldAlert, Trash2, Users, ChevronDown, ChevronUp, ToggleLeft, ToggleRight,
  AlertTriangle,
} from "lucide-react";
import { jobsSupabase, isJobOpen, type Job } from "@/lib/jobsSupabase";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const JOB_TYPES: { value: Job["job_type"]; label: string }[] = [
  { value: "full_time",  label: "Full-time" },
  { value: "part_time",  label: "Part-time" },
  { value: "internship", label: "Internship" },
  { value: "remote",     label: "Remote" },
  { value: "contract",   label: "Contract" },
];

const EMPTY_DRAFT = {
  title: "", company: "", description: "", location: "",
  job_type: "full_time" as Job["job_type"], salary_range: "",
  external_link: "", deadline: "",
};

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Post / edit form ────────────────────────────────────────────────
function JobPostForm({ editingJob, onSaved, onClose }: {
  editingJob: Job | null; onSaved: () => void; onClose: () => void;
}) {
  const { toast } = useToast();
  const photoRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(editingJob ? {
    title: editingJob.title, company: editingJob.company, description: editingJob.description,
    location: editingJob.location ?? "", job_type: editingJob.job_type,
    salary_range: editingJob.salary_range ?? "", external_link: editingJob.external_link ?? "",
    deadline: editingJob.deadline ? editingJob.deadline.slice(0, 10) : "",
  } : EMPTY_DRAFT);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(editingJob?.photo_url ?? null);
  const [saving, setSaving] = useState(false);
  const [checkingLink, setCheckingLink] = useState(false);
  const [linkResult, setLinkResult] = useState<{ valid: boolean; title?: string | null; reason?: string } | null>(
    editingJob?.link_verified ? { valid: true, title: editingJob.link_preview_title } : null
  );
  const [dupeWarning, setDupeWarning] = useState<string | null>(null);

  const set = (k: keyof typeof draft, v: string) => setDraft(p => ({ ...p, [k]: v }));

  // Gentle duplicate check — queries the public, already-readable jobs table
  // directly from the client. Just a heads-up, never blocks posting.
  const checkDuplicate = async () => {
    if (!draft.title.trim()) return;
    const { data } = await jobsSupabase.from("jobs")
      .select("id,title,company")
      .ilike("title", `%${draft.title.trim()}%`)
      .limit(3);
    const others = (data ?? []).filter(j => j.id !== editingJob?.id);
    setDupeWarning(others.length
      ? `Heads up — "${others[0].title}" at ${others[0].company} is already posted. Might be a duplicate.`
      : null);
  };

  const verifyLink = async () => {
    if (!draft.external_link.trim()) return;
    setCheckingLink(true);
    setLinkResult(null);
    try {
      const res = await fetch("/api/manage-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ action: "verify_link", url: draft.external_link.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check failed");
      setLinkResult(data);
    } catch (e: any) {
      setLinkResult({ valid: false, reason: e.message });
    } finally {
      setCheckingLink(false);
    }
  };

  const pickPhoto = () => {
    photoRef.current?.click();
    photoRef.current?.addEventListener("change", () => {
      const f = photoRef.current?.files?.[0];
      if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); }
    }, { once: true });
  };

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleSubmit = async () => {
    if (!draft.title.trim() || !draft.company.trim() || !draft.description.trim()) {
      toast({ title: "Title, company and description are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeader()) };
      const payload: any = {
        title: draft.title.trim(),
        company: draft.company.trim(),
        description: draft.description.trim(),
        location: draft.location.trim() || null,
        job_type: draft.job_type,
        salary_range: draft.salary_range.trim() || null,
        external_link: draft.external_link.trim() || null,
        link_verified: linkResult?.valid ?? false,
        link_preview_title: linkResult?.title ?? null,
        deadline: draft.deadline ? new Date(draft.deadline).toISOString() : null,
      };

      let photoBase64: string | undefined;
      if (photoFile) photoBase64 = await fileToBase64(photoFile);

      const res = await fetch("/api/manage-jobs", {
        method: "POST",
        headers,
        body: JSON.stringify(
          editingJob
            ? { action: "update", jobId: editingJob.id, patch: payload, photoBase64, photoFileName: photoFile?.name }
            : { action: "create", job: payload, photoBase64, photoFileName: photoFile?.name }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      toast({ title: editingJob ? "✅ Job updated!" : "🎉 Job posted! People will love this one." });
      onSaved(); onClose();
    } catch (e: any) {
      toast({ title: "Couldn't save that", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all";

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 0px) + 12px)" }}>
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg flex flex-col" style={{ height: "88vh", maxHeight: "88vh" }}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Briefcase className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <h2 className="font-bold text-sm">{editingJob ? "Edit job" : "Post a new job"}</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 flex flex-col gap-3">
            {/* Reference photo — kept as-is, purely visual proof, no processing */}
            <div onClick={pickPhoto}
              className="h-28 rounded-xl border-2 border-dashed border-border cursor-pointer overflow-hidden bg-muted/30 hover:border-emerald-500/40 transition-colors flex items-center justify-center">
              {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Upload className="w-4 h-4" />
                  <span className="text-[11px]">Attach a reference photo (optional — e.g. your WhatsApp screenshot)</span>
                </div>
              )}
            </div>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" />

            <input value={draft.title} onChange={e => set("title", e.target.value)} onBlur={checkDuplicate}
              placeholder="Job title *" className={inp} />
            {dupeWarning && (
              <p className="flex items-start gap-1.5 text-[11px] text-amber-500 bg-amber-500/10 rounded-lg px-2.5 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {dupeWarning}
              </p>
            )}
            <input value={draft.company} onChange={e => set("company", e.target.value)} placeholder="Company / organization *" className={inp} />

            <textarea value={draft.description} onChange={e => set("description", e.target.value)}
              placeholder="Paste the job text here — description, requirements, anything you copied *"
              rows={6} className={`${inp} resize-none leading-relaxed`} />

            <div className="grid grid-cols-2 gap-2">
              <select value={draft.job_type} onChange={e => set("job_type", e.target.value)} className={inp}>
                {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input value={draft.location} onChange={e => set("location", e.target.value)} placeholder="Location" className={inp} />
            </div>

            <input value={draft.salary_range} onChange={e => set("salary_range", e.target.value)} placeholder="Pay / salary range (optional)" className={inp} />

            <div>
              <div className="flex gap-2">
                <input value={draft.external_link} onChange={e => { set("external_link", e.target.value); setLinkResult(null); }}
                  placeholder="Original link (optional)" className={`${inp} flex-1`} />
                <button onClick={verifyLink} disabled={!draft.external_link.trim() || checkingLink}
                  className="shrink-0 flex items-center gap-1 px-3 rounded-xl bg-blue-500/15 text-blue-500 text-xs font-bold disabled:opacity-50">
                  {checkingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Link2 className="w-3.5 h-3.5" /> Check</>}
                </button>
              </div>
              {linkResult && (
                <p className={`flex items-center gap-1.5 text-[11px] mt-1.5 ${linkResult.valid ? "text-emerald-500" : "text-red-400"}`}>
                  {linkResult.valid ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  {linkResult.valid ? `Looks real${linkResult.title ? ` — "${linkResult.title}"` : ""}` : linkResult.reason}
                </p>
              )}
            </div>

            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Deadline (optional — job auto-closes after this date)</p>
              <input type="date" value={draft.deadline} onChange={e => set("deadline", e.target.value)} className={inp} />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border shrink-0">
          <button onClick={handleSubmit} disabled={saving}
            className="w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-white active:scale-[0.98] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><PlusCircle className="w-4 h-4" /> {editingJob ? "Save changes" : "Post job"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Applicants list ─────────────────────────────────────────────────
function ApplicantsPanel({ job, onClose }: { job: Job; onClose: () => void }) {
  const { toast } = useToast();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manage-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ action: "list_applications", jobId: job.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApps(data.applications);
    } catch (e: any) {
      toast({ title: "Couldn't load applicants", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [job.id]);

  const markReviewed = async (id: string) => {
    await fetch("/api/manage-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ action: "update_application_status", applicationId: id, status: "reviewed" }),
    });
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: "reviewed" } : a));
  };

  return (
    <div className="fixed inset-0 z-[75] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg flex flex-col" style={{ height: "80vh", maxHeight: "80vh" }}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border shrink-0">
          <div>
            <p className="font-bold text-sm">Applicants</p>
            <p className="text-[11px] text-muted-foreground">{job.title}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : apps.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-10">No one's applied yet — give it time!</p>
          ) : (
            <div className="space-y-2">
              {apps.map(a => (
                <div key={a.id} className="bg-muted/30 border border-border/50 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">{a.full_name}</p>
                    {a.status === "new" ? (
                      <button onClick={() => markReviewed(a.id)} className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">Mark reviewed</button>
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-full">Reviewed</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.contact}</p>
                  {a.cover_note && <p className="text-xs mt-2 leading-relaxed whitespace-pre-wrap">{a.cover_note}</p>}
                  <p className="text-[10px] text-muted-foreground mt-2">{new Date(a.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main export — job list + management ─────────────────────────────
export function JobsAdmin() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [applicantsFor, setApplicantsFor] = useState<Job | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await jobsSupabase.from("jobs").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load jobs", description: error.message, variant: "destructive" });
    else setJobs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (job: Job) => {
    const next = job.status === "open" ? "closed" : "open";
    const res = await fetch("/api/manage-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ action: "update", jobId: job.id, patch: { status: next } }),
    });
    if (res.ok) {
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: next } : j));
      toast({ title: next === "open" ? "Marked available again" : "Marked no longer available" });
    }
  };

  const deleteJob = async (job: Job) => {
    if (!confirm(`Delete "${job.title}"? This can't be undone.`)) return;
    const res = await fetch("/api/manage-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ action: "delete", jobId: job.id }),
    });
    if (res.ok) { setJobs(prev => prev.filter(j => j.id !== job.id)); toast({ title: "Deleted" }); }
  };

  return (
    <div className="pt-3 pb-4 space-y-3">
      <button onClick={() => { setEditingJob(null); setShowForm(true); }}
        className="w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-white active:scale-[0.98]"
        style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
        <PlusCircle className="w-4 h-4" /> Post a new job
      </button>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : jobs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-10">No jobs posted yet — this is where they'll show up.</p>
      ) : (
        <div className="space-y-2">
          {jobs.map(job => (
            <div key={job.id} className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{job.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{job.company}</p>
                </div>
                <button onClick={() => setExpandedId(p => p === job.id ? null : job.id)} className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                  {expandedId === job.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {expandedId === job.id && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <button onClick={() => toggleStatus(job)} className="w-full flex items-center justify-between text-xs font-semibold bg-muted/30 rounded-lg px-3 py-2">
                    <span>{job.status === "open" ? "Available" : "No longer available"}</span>
                    {job.status === "open" ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                  </button>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button onClick={() => { setEditingJob(job); setShowForm(true); }} className="text-[11px] font-semibold py-2 rounded-lg border border-border text-muted-foreground">Edit</button>
                    <button onClick={() => setApplicantsFor(job)} className="flex items-center justify-center gap-1 text-[11px] font-semibold py-2 rounded-lg border border-border text-muted-foreground">
                      <Users className="w-3 h-3" /> {job.apply_count}
                    </button>
                    <button onClick={() => deleteJob(job)} className="flex items-center justify-center gap-1 text-[11px] font-semibold py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && <JobPostForm editingJob={editingJob} onSaved={load} onClose={() => setShowForm(false)} />}
      {applicantsFor && <ApplicantsPanel job={applicantsFor} onClose={() => setApplicantsFor(null)} />}
    </div>
  );
}
