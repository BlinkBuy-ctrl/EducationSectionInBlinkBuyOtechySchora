import { useState, useEffect, useMemo } from "react";
import {
  Briefcase, MapPin, Clock, Bookmark, Share2, Plus,
  CheckCircle2, Building2, Wifi, WifiOff,
} from "lucide-react";
import { jobsSupabase, isJobOpen, type Job } from "@/lib/jobsSupabase";
import { AnimatedSearchInput } from "@/components/education/AnimatedSearchInput";
import { JobDetailModal } from "@/components/education/JobDetailModal";
import { useToast } from "@/hooks/use-toast";
import { safeGetItem, safeSetItem } from "@/lib/storage";

const JOB_SEARCH_PHRASES = [
  "Search Software jobs…",
  "Search Remote jobs…",
  "Search by company…",
  "Search by location…",
  "Search Internships…",
];

const JOB_TYPE_LABELS: Record<Job["job_type"], string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  internship: "Internship",
  remote: "Remote",
  contract: "Contract",
};

const APPLIED_KEY = "schorahub_applied_job_ids";

export function getAppliedJobIds(): Set<string> {
  try {
    const raw = safeGetItem(APPLIED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

export function markJobApplied(jobId: string) {
  const ids = getAppliedJobIds();
  ids.add(jobId);
  safeSetItem(APPLIED_KEY, JSON.stringify([...ids]));
}

/** Days left until a deadline, or null if there is none / it's already passed. */
function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return null;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

interface Props {
  jobs: Job[];
  loading: boolean;
  user: any;
  onRefresh: () => void;
  isOnline?: boolean;
}

function JobCard({ job, saved, applied, onOpen, onToggleSave, onShare }: {
  job: Job; saved: boolean; applied: boolean;
  onOpen: (j: Job) => void; onToggleSave: (j: Job) => void; onShare: (j: Job) => void;
}) {
  const open = isJobOpen(job);
  const left = daysLeft(job.deadline);

  return (
    <div
      onClick={() => onOpen(job)}
      className="bg-card border border-border rounded-2xl p-3.5 flex flex-col gap-2.5 cursor-pointer active:scale-[0.99] transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0 overflow-hidden">
          {job.photo_url ? (
            <img src={job.photo_url} className="w-full h-full object-cover" alt="" />
          ) : (
            <Briefcase className="w-5 h-5 text-emerald-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-bold text-sm text-foreground leading-tight">{job.title}</h3>
            {applied && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-500 shrink-0">
                <CheckCircle2 className="w-3 h-3" /> Applied
              </span>
            )}
          </div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Building2 className="w-3 h-3 shrink-0" /> {job.company}
          </p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onToggleSave(job); }}
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 active:scale-90 transition-all ${
            saved ? "bg-emerald-500/15 text-emerald-500" : "bg-muted/40 text-muted-foreground"
          }`}
        >
          <Bookmark className={`w-4 h-4 ${saved ? "fill-emerald-500" : ""}`} />
        </button>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
          {JOB_TYPE_LABELS[job.job_type]}
        </span>
        {job.location && (
          <span className="flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground">
            <MapPin className="w-2.5 h-2.5" /> {job.location}
          </span>
        )}
        {!open ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
            No longer available
          </span>
        ) : left !== null && left <= 3 ? (
          <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
            <Clock className="w-2.5 h-2.5" /> Closing {left === 1 ? "tomorrow" : `in ${left} days`}
          </span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
            Available
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border/60">
        <p className="text-[10px] text-muted-foreground line-clamp-1 flex-1 pr-2">{job.description}</p>
        <button
          onClick={e => { e.stopPropagation(); onShare(job); }}
          className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center shrink-0 active:scale-90 transition-all"
        >
          <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

export function JobsTab({ jobs, loading, user, onRefresh, isOnline = true }: Props) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "closing" | "saved" | Job["job_type"]>("all");
  const [selected, setSelected] = useState<Job | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(getAppliedJobIds());

  useEffect(() => {
    if (!user?.id) return;
    jobsSupabase.from("job_bookmarks").select("job_id").eq("user_id", user.id)
      .then(({ data }) => { if (data) setSavedIds(new Set(data.map((r: any) => r.job_id))); });
  }, [user?.id]);

  const toggleSave = async (job: Job) => {
    const isSaved = savedIds.has(job.id);
    setSavedIds(prev => {
      const next = new Set(prev);
      isSaved ? next.delete(job.id) : next.add(job.id);
      return next;
    });
    try {
      if (isSaved) {
        await jobsSupabase.from("job_bookmarks").delete().eq("job_id", job.id).eq("user_id", user.id);
      } else {
        await jobsSupabase.from("job_bookmarks").insert({ job_id: job.id, user_id: user.id });
        toast({ title: "🔖 Saved! You'll find it under Saved jobs." });
      }
    } catch (e: any) {
      toast({ title: "Couldn't save that", description: e.message, variant: "destructive" });
    }
  };

  const shareJob = async (job: Job) => {
    const text = `${job.title} at ${job.company}${job.location ? ` — ${job.location}` : ""}. Check it out on SchoraHub!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: job.title, text, url: job.external_link || window.location.href });
      } else {
        await navigator.clipboard.writeText(`${text} ${job.external_link || ""}`.trim());
        toast({ title: "Copied! Ready to paste and share." });
      }
    } catch { /* user cancelled share sheet — no need to toast */ }
  };

  const handleApplied = (jobId: string) => {
    markJobApplied(jobId);
    setAppliedIds(getAppliedJobIds());
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return jobs.filter(j => {
      const matchQ = !q ||
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        (j.location ?? "").toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q);
      if (!matchQ) return false;
      if (filter === "all") return true;
      if (filter === "saved") return savedIds.has(j.id);
      if (filter === "open") return isJobOpen(j);
      if (filter === "closing") { const d = daysLeft(j.deadline); return isJobOpen(j) && d !== null && d <= 3; }
      return j.job_type === filter;
    });
  }, [jobs, search, filter, savedIds]);

  const searchSuggestions = useMemo(() => {
    const companies = jobs.map(j => j.company);
    const titles = jobs.map(j => j.title);
    const locations = jobs.map(j => j.location).filter(Boolean) as string[];
    return [...new Set([...titles, ...companies, ...locations])];
  }, [jobs]);

  return (
    <div className="flex flex-col gap-3">
      {!isOnline && jobs.length > 0 && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2">
          <WifiOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <p className="text-[11px] text-amber-500 font-medium">
            You're offline — showing saved postings. Availability may have changed since you last connected.
          </p>
        </div>
      )}

      <AnimatedSearchInput
        value={search}
        onChange={setSearch}
        phrases={JOB_SEARCH_PHRASES}
        ringColorClass="focus:ring-emerald-500/40"
        ariaLabel="Search jobs, companies or locations"
        suggestionPool={searchSuggestions}
      />

      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {([
          { key: "all",        label: `All · ${jobs.length}` },
          { key: "open",       label: "🟢 Available" },
          { key: "closing",    label: "⏳ Closing soon" },
          { key: "saved",      label: `🔖 Saved · ${savedIds.size}` },
          { key: "remote",     label: "Remote" },
          { key: "full_time",  label: "Full-time" },
          { key: "part_time",  label: "Part-time" },
          { key: "internship", label: "Internship" },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
              filter === f.key ? "bg-emerald-600 border-emerald-600 text-white" : "border-border text-muted-foreground bg-background"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 py-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-emerald-500" />
          </div>
          <p className="font-semibold text-sm text-foreground">
            {jobs.length === 0 ? "No jobs posted yet — but they're coming!" : search ? "No jobs match your search" : "Nothing here right now"}
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {jobs.length === 0
              ? "Turn on notifications so you're the first to know the moment a new opportunity lands here."
              : "Try a different search or filter — new opportunities get added often."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(j => (
            <JobCard
              key={j.id} job={j}
              saved={savedIds.has(j.id)}
              applied={appliedIds.has(j.id)}
              onOpen={setSelected}
              onToggleSave={toggleSave}
              onShare={shareJob}
            />
          ))}
        </div>
      )}

      {selected && (
        <JobDetailModal
          job={selected}
          user={user}
          saved={savedIds.has(selected.id)}
          applied={appliedIds.has(selected.id)}
          onToggleSave={toggleSave}
          onApplied={handleApplied}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
