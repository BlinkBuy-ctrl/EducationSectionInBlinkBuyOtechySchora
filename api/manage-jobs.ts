import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// ── Jobs project (service role — bypasses RLS, server-only) ───────────────
const JOBS_SUPABASE_URL = 'https://mgsdzardxtaiuczfarsi.supabase.co';
const JOBS_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nc2R6YXJkeHRhaXVjemZhcnNpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODI0OTE2OSwiZXhwIjoyMTAzODI1MTY5fQ.b01Dxt9KTV61DMyDRPeL0xn4EYfraBX7thu37403HEk';
const jobsDb = createClient(JOBS_SUPABASE_URL, JOBS_SUPABASE_SERVICE_ROLE_KEY);

// ── Main project (anon key only — used just to verify the admin's own
// session token, respecting the same RLS your admin login already relies
// on). Reads from the same env vars the app itself needs to run.
const MAIN_SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const MAIN_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

// ── Push notifications — same VAPID keys + bookshop project used by
// notify-new-upload.ts, folded in here directly (no separate function/
// network hop) so this one file covers posting AND notifying.
const VAPID_PUBLIC_KEY  = 'BGIoLhtHS59h97l8zrnMNnVKRM6gGcArrow9INvV8QGRz8Un7VJxUdOBo3bBkowsfmj86Lh4w2LK_xEzb2-xvOc';
const VAPID_PRIVATE_KEY = 'Gvy6zfX9tEnu_94iPvPfXuhGJAvQ92fNVgEFEOYX0UI';
const BOOKSHOP_SUPABASE_URL = 'https://sahxijuxztcdncgoorun.supabase.co';
const BOOKSHOP_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhaHhpanV4enRjZG5jZ29vcnVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDI5MDAwMCwiZXhwIjoyMDk5ODY2MDAwfQ.VZa5ajKqABNbcBVq6nAJwnHxWa2NfEQr-ZdTff1wF5U';
webpush.setVapidDetails('mailto:support@schorahub.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const bookshopDb = createClient(BOOKSHOP_SUPABASE_URL, BOOKSHOP_SUPABASE_SERVICE_ROLE_KEY);

async function broadcastNewJobPush(title: string, company: string) {
  try {
    const { data: subs } = await bookshopDb.from('otechy_push_subscriptions').select('*');
    const payload = JSON.stringify({
      title: '💼 New job posted on SchoraHub!',
      body: `"${title}" at ${company} just went live — take a look.`,
      url: '/',
    });
    await Promise.all((subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await bookshopDb.from('otechy_push_subscriptions').delete().eq('endpoint', s.endpoint);
        }
      }
    }));
  } catch { /* notifications are a nice-to-have — never block the actual post on this */ }
}

async function verifyAdmin(req: VercelRequest): Promise<{ id: string; name: string } | null> {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !MAIN_SUPABASE_URL || !MAIN_SUPABASE_ANON_KEY) return null;

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

// Plain reachability + title check — no AI, nothing that can hit a rate
// limit. Just confirms a pasted link is real and live.
async function checkLink(url: string) {
  let target: URL;
  try {
    target = new URL(url);
    if (!['http:', 'https:'].includes(target.protocol)) throw new Error('bad protocol');
  } catch {
    return { valid: false, reason: "That doesn't look like a valid link." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(target.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SchoraHubJobsBot/1.0)' },
    });
    clearTimeout(timeout);
    if (!response.ok) return { valid: false, reason: `Link responded with status ${response.status}.` };

    const reader = response.body?.getReader();
    let html = '';
    if (reader) {
      const decoder = new TextDecoder();
      while (html.length < 20000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        if (html.includes('</title>')) break;
      }
      reader.cancel().catch(() => {});
    }
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().slice(0, 200) : null;
    return { valid: true, finalUrl: response.url, title };
  } catch (e: any) {
    clearTimeout(timeout);
    return { valid: false, reason: e.name === 'AbortError' ? 'Link took too long to respond.' : 'Could not reach that link.' };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Admin login required' });

  const { action } = req.body ?? {};

  try {
    if (action === 'verify_link') {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: 'url required' });
      return res.status(200).json(await checkLink(url));
    }

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

      broadcastNewJobPush(job.title, job.company); // fire-and-forget, doesn't block the response

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
