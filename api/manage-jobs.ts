import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ── Jobs project (service role — bypasses RLS, server-only) ───────────────
const JOBS_SUPABASE_URL = 'https://mgsdzardxtaiuczfarsi.supabase.co';
// Paste the JOBS project's service_role key here (Supabase dashboard →
// Settings → API → service_role, NOT the anon key). Server-only — never
// import this file from client code.
const JOBS_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nc2R6YXJkeHRhaXVjemZhcnNpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODI0OTE2OSwiZXhwIjoyMTAzODI1MTY5fQ.b01Dxt9KTV61DMyDRPeL0xn4EYfraBX7thu37403HEk';

const jobsDb = createClient(JOBS_SUPABASE_URL, JOBS_SUPABASE_SERVICE_ROLE_KEY);

// ── Main project (anon key only — used just to verify the admin's own
// session token, respecting the same RLS your admin login already relies
// on). Reads from the same env vars the app itself needs to run, so no
// extra secret to set up. ─────────────────────────────────────────────────
const MAIN_SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const MAIN_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

async function verifyAdmin(req: VercelRequest): Promise<{ id: string; name: string } | null> {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !MAIN_SUPABASE_URL || !MAIN_SUPABASE_ANON_KEY) return null;

  // A client scoped to this one request, carrying the admin's own token —
  // so the profile lookup below runs with THEIR permissions, same as it
  // would in the browser (see adminAuth.ts's getActiveAdminProfile).
  const asUser = createClient(MAIN_SUPABASE_URL, MAIN_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await asUser.auth.getUser(token);
  if (userErr || !userData.user) return null;

  const { data: profile, error: profileErr } = await asUser
    .from('profiles')
    .select('id,name,is_admin')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileErr || !profile || !profile.is_admin) return null;
  return { id: profile.id, name: profile.name };
}

// Uploads a reference photo (base64, from the admin's paste/upload) into the
// jobs-images bucket using the service role — the only writer allowed,
// since the bucket's RLS policy is read-only for the anon key.
async function uploadJobPhoto(photoBase64: string, fileName: string): Promise<string> {
  const buffer = Buffer.from(photoBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const ext = fileName.split('.').pop() || 'jpg';
  const path = `postings/${Date.now()}.${ext}`;
  const { error } = await jobsDb.storage.from('jobs-images').upload(path, buffer, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: true,
  });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return jobsDb.storage.from('jobs-images').getPublicUrl(path).data.publicUrl;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Admin login required' });

  const { action } = req.body ?? {};

  try {
    if (action === 'create') {
      const { job, photoBase64, photoFileName } = req.body;
      if (!job?.title || !job?.company || !job?.description) {
        return res.status(400).json({ error: 'Title, company and description are required' });
      }

      let photo_url: string | null = null;
      if (photoBase64 && photoFileName) {
        photo_url = await uploadJobPhoto(photoBase64, photoFileName);
      }

      const { data, error } = await jobsDb
        .from('jobs')
        .insert({ ...job, photo_url, posted_by: admin.name })
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json({ job: data });
    }

    if (action === 'update') {
      const { jobId, patch, photoBase64, photoFileName } = req.body;
      if (!jobId) return res.status(400).json({ error: 'jobId required' });

      const finalPatch = { ...patch };
      if (photoBase64 && photoFileName) {
        finalPatch.photo_url = await uploadJobPhoto(photoBase64, photoFileName);
      }

      const { data, error } = await jobsDb.from('jobs').update(finalPatch).eq('id', jobId).select().single();
      if (error) throw error;
      return res.status(200).json({ job: data });
    }

    if (action === 'delete') {
      const { jobId } = req.body;
      if (!jobId) return res.status(400).json({ error: 'jobId required' });
      const { error } = await jobsDb.from('jobs').delete().eq('id', jobId);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === 'list_applications') {
      const { jobId } = req.body;
      if (!jobId) return res.status(400).json({ error: 'jobId required' });
      const { data, error } = await jobsDb
        .from('job_applications')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ applications: data });
    }

    if (action === 'update_application_status') {
      const { applicationId, status } = req.body;
      if (!applicationId || !status) return res.status(400).json({ error: 'applicationId and status required' });
      const { error } = await jobsDb.from('job_applications').update({ status }).eq('id', applicationId);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message ?? 'Something went wrong' });
  }
}
