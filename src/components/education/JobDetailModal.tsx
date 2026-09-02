import { useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Briefcase, Building2, MapPin, Clock, DollarSign, ExternalLink,
  BadgeCheck, Bookmark, Share2, Send, Loader2, CheckCircle2, Maximize2,
} from "lucide-react";
import { jobsSupabase, isJobOpen, type Job } from "@/lib/jobsSupabase";
import { useToast } from "@/hooks/use-toast";

const JOB_TYPE_LABELS: Record<Job["job_type"], string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  internship: "Internship",
  remote: "Remote",
  contract: "Contract",
};

interface Props {
  job: Job;
  user: any;
  saved: boolean;
  applied: boolean;
  onToggleSave: (job: Job) => void;
  onApplied: (jobId: string) => void;
  onClose: () => void;
}

export function JobDetailModal({ job, user, saved, applied, onToggleSave, onApplied, onClose }: Props) {
  const { toast } = useToast();
  const [showApply, setShowApply] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fullImage, setFullImage] = useState(false);
  const [form, setForm] = useState({ full_name: "", contact: "", cover_note: "" });

  const open = isJobOpen(job);

  const submitApplication = async () => {
    if (!form.full_name.trim() || !form.contact.trim()) {
      toast({ title: "Name and contact are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await jobsSupabase.from("job_applications").insert({
        job_id: job.id,
        applicant_id: user.id,
        full_name: form.full_name.trim(),
        contact: form.contact.trim(),
        cover_note: form.cover_note.trim() || null,
      });
      if (error) {
        if (error.code === "23505") {
          toast({ title: "You've already applied to this one!", description: "We've got your application on file." });
          onApplied(job.id);
          setShowApply(false);
          return;
        }
        throw error;
      }
      await jobsSupabase.from("jobs").update({ apply_count: job.apply_count + 1 }).eq("id", job.id);
      toast({ title: "🎉 Application sent!", description: "Fingers crossed — good luck!" });
      onApplied(job.id);
      setShowApply(false);
    } catch (e: any) {
      toast({ title: "Couldn't send that", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const inp = "w-full bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all";

  return (
    <>
    {createPortal(
      <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.75)" }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="w-full max-w-lg bg-card rounded-t-3xl flex flex-col overflow-hidden" style={{ height: "90vh", maxHeight: "90vh" }}
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-start gap-3 px-4 pt-4 pb-3 border-b border-border shrink-0">
            <div
              className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0 overflow-hidden"
              onClick={() => job.photo_url && setFullImage(true)}
            >
              {job.photo_url ? <img src={job.photo_url} className="w-full h-full object-cover" alt="" /> : <Briefcase className="w-5 h-5 text-emerald-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-base text-foreground leading-tight">{job.title}</h2>
              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Building2 className="w-3 h-3" /> {job.company}
              </p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="p-4 flex flex-col gap-4">

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500">
                  {JOB_TYPE_LABELS[job.job_type]}
                </span>
                {!open ? (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-500/10 text-red-400">No longer available</span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500">Available</span>
                )}
                {applied && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="w-3 h-3" /> You applied
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {job.location && (
                  <div className="flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2.5 border border-border/50">
                    <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <div className="min-w-0"><p className="text-[9px] text-muted-foreground uppercase font-semibold">Location</p><p className="text-xs font-bold truncate">{job.location}</p></div>
                  </div>
                )}
                {job.salary_range && (
                  <div className="flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2.5 border border-border/50">
                    <DollarSign className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    <div className="min-w-0"><p className="text-[9px] text-muted-foreground uppercase font-semibold">Pay</p><p className="text-xs font-bold truncate">{job.salary_range}</p></div>
                  </div>
                )}
                {job.deadline && (
                  <div className="flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2.5 border border-border/50 col-span-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div className="min-w-0"><p className="text-[9px] text-muted-foreground uppercase font-semibold">Deadline</p><p className="text-xs font-bold truncate">{new Date(job.deadline).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</p></div>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">About this role</p>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{job.description}</p>
              </div>

              {job.external_link && (
                <a href={job.external_link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 bg-muted/30 border border-border/50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="text-xs font-semibold truncate">{job.link_preview_title || "Original posting"}</span>
                  </div>
                  {job.link_verified && (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-blue-500 shrink-0">
                      <BadgeCheck className="w-3 h-3" /> Verified
                    </span>
                  )}
                </a>
              )}

              <button onClick={() => onToggleSave(job)}
                className={`self-start flex items-center gap-2 px-4 py-2 rounded-xl border transition-all active:scale-95 ${
                  saved ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-500" : "bg-muted/30 border-border text-muted-foreground"
                }`}>
                <Bookmark className={`w-4 h-4 ${saved ? "fill-emerald-500" : ""}`} />
                <span className="text-xs font-bold">{saved ? "Saved" : "Save for later"}</span>
              </button>

              {showApply && (
                <div className="bg-muted/30 border border-border rounded-xl p-3.5 flex flex-col gap-2.5">
                  <p className="text-xs font-bold text-foreground">Apply for this role</p>
                  <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Your full name *" className={inp} />
                  <input value={form.contact} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))} placeholder="Phone or email *" className={inp} />
                  <textarea value={form.cover_note} onChange={e => setForm(p => ({ ...p, cover_note: e.target.value }))} placeholder="A short note about why you're a great fit (optional)" rows={3} className={`${inp} resize-none`} />
                  <button onClick={submitApplication} disabled={submitting}
                    className="flex items-center justify-center gap-2 font-bold py-2.5 rounded-xl bg-emerald-600 text-white text-xs active:scale-[0.98] disabled:opacity-60">
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Submit application</>}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sticky footer */}
          <div className="px-4 py-3 border-t border-border bg-card shrink-0 flex gap-2">
            <button
              onClick={async () => {
                const text = `${job.title} at ${job.company}. Check it out on SchoraHub!`;
                if (navigator.share) navigator.share({ title: job.title, text, url: job.external_link || window.location.href }).catch(() => {});
                else { await navigator.clipboard.writeText(text); toast({ title: "Copied!" }); }
              }}
              className="w-11 h-11 rounded-xl bg-muted/40 flex items-center justify-center shrink-0"
            >
              <Share2 className="w-4 h-4 text-muted-foreground" />
            </button>
            {open && !applied && (
              <button onClick={() => setShowApply(s => !s)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold text-white active:scale-[0.97] transition-all"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                <Send className="w-3.5 h-3.5" /> {showApply ? "Hide form" : "Apply now"}
              </button>
            )}
            {applied && (
              <div className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold text-emerald-500 bg-emerald-500/10">
                <CheckCircle2 className="w-3.5 h-3.5" /> Application sent
              </div>
            )}
            {!open && !applied && (
              <div className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold text-muted-foreground bg-muted/40">
                This role is no longer available
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    )}

    {fullImage && job.photo_url && createPortal(
      <div className="fixed inset-0 z-[80] bg-black flex items-center justify-center" onClick={() => setFullImage(false)}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <img src={job.photo_url} alt="" className="max-w-full max-h-full object-contain" />
        <button onClick={() => setFullImage(false)} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center" style={{ marginTop: "env(safe-area-inset-top, 0px)" }}>
          <X className="w-4 h-4 text-white" />
        </button>
      </div>,
      document.body
    )}
    </>
  );
}
