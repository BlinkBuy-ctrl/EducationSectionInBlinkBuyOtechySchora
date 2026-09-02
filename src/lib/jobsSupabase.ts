import { createClient } from '@supabase/supabase-js'

// Hardcoded per your instruction — this is a SEPARATE Supabase project from
// the main SchoraHub one, isolated to the Jobs section only. Same pattern as
// bookshopSupabase.ts and aiModeSupabase.ts.
const JOBS_SUPABASE_URL = 'https://mgsdzardxtaiuczfarsi.supabase.co'
const JOBS_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nc2R6YXJkeHRhaXVjemZhcnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNDkxNjksImV4cCI6MjEwMzgyNTE2OX0.RtOL0Yom4wm47l0JJpm-dvx0NCpiUGpp1JMVKQkl8tU'

export const jobsSupabase = createClient(JOBS_SUPABASE_URL, JOBS_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // Jobs has no login of its own — admin auth happens on the main project
  },
  global: { headers: { 'X-Client-Info': 'schorahub-jobs' } },
})

// ── Types ────────────────────────────────────────────────────────────────
export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string | null;
  job_type: 'full_time' | 'part_time' | 'internship' | 'remote' | 'contract';
  salary_range: string | null;
  external_link: string | null;
  link_verified: boolean;
  link_preview_title: string | null;
  photo_url: string | null;
  source_note: string | null;
  deadline: string | null;
  status: 'open' | 'closed';
  posted_by: string | null;
  view_count: number;
  apply_count: number;
  created_at: string;
  updated_at: string;
}

/** True if a job is genuinely open right now — combines the manual status
 *  toggle with the deadline, so a forgotten-open posting still auto-closes. */
export function isJobOpen(job: Job): boolean {
  if (job.status === 'closed') return false;
  if (job.deadline && new Date(job.deadline).getTime() < Date.now()) return false;
  return true;
}
