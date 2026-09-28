import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ── Higher Education project (service role — bypasses RLS, server-only) ──
const HIGHER_ED_SUPABASE_URL = 'https://miceczfibiewvijryzhe.supabase.co';
const HIGHER_ED_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pY2VjemZpYmlld3ZpanJ5emhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDI0ODA1NywiZXhwIjoyMTA1ODI0MDU3fQ.H5tOLtAMJ-4TfLNE95uDah5AjC6rljaIOo7LiRUX1Uw';
const higherEdDb = createClient(HIGHER_ED_SUPABASE_URL, HIGHER_ED_SUPABASE_SERVICE_ROLE_KEY);

const LOGO_BUCKET = 'university-logos';

// ── Main project (anon key only — used just to verify the admin's own
// session token, same pattern as manage-jobs.ts). Reads from the same
// env vars the app itself needs to run.
const MAIN_SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const MAIN_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

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

async function uploadLogo(logoBase64: string, fileName: string, universityName: string): Promise<string> {
  const buffer = Buffer.from(logoBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const safeName = universityName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const ext = fileName.split('.').pop() || 'png';
  const path = `${safeName}-${Date.now()}.${ext}`;

  const { error } = await higherEdDb.storage.from(LOGO_BUCKET).upload(path, buffer, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: false,
  });
  if (error) throw new Error(`Logo upload failed: ${error.message}`);

  return higherEdDb.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
}


// ── Education files (Files Library) — merged in from manage-education-files.ts
// so we stay under Vercel Hobby's 12-serverless-function limit. These actions
// are PUBLIC (any visitor can upload); only university/link actions need admin.
const FILES_BUCKET = 'education-files';

function pathFromPublicUrl(fileUrl: string): string | null {
  const marker = `/object/public/${FILES_BUCKET}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  return fileUrl.slice(idx + marker.length);
}

async function handleFileAction(action: string, body: any, res: VercelResponse): Promise<VercelResponse | null> {
  if (action === 'list') {
    const { university_id, program, category } = body ?? {};
    let query = higherEdDb.from('education_files').select('*').order('created_at', { ascending: false });
    if (university_id) query = query.eq('university_id', university_id);
    if (program) query = query.eq('program', program);
    if (category) query = query.eq('category', category);
    const { data, error } = await query;
    if (error) throw error;
    return res.status(200).json({ files: data });
  }

  if (action === 'create') {
    const file = body?.file;
    if (!file?.university_id || !file?.program || !file?.category || !file?.title || !file?.file_url || !file?.file_type) {
      return res.status(400).json({ error: 'university_id, program, category, title, file_url and file_type are required' });
    }
    const { data, error } = await higherEdDb
      .from('education_files')
      .insert({
        university_id: file.university_id,
        program: String(file.program).trim(),
        category: String(file.category).trim(),
        title: String(file.title).trim(),
        uploaded_by: file.uploaded_by ? String(file.uploaded_by).trim() : null,
        file_url: file.file_url,
        cover_url: file.cover_url || null,
        file_type: file.file_type,
      })
      .select()
      .single();
    if (error) throw error;
    return res.status(200).json({ file: data });
  }

  if (action === 'delete') {
    const { fileId } = body ?? {};
    if (!fileId) return res.status(400).json({ error: 'fileId required' });

    const { data: existing, error: fetchErr } = await higherEdDb
      .from('education_files')
      .select('file_url, cover_url')
      .eq('id', fileId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    const pathsToRemove: string[] = [];
    if (existing?.file_url) { const p = pathFromPublicUrl(existing.file_url); if (p) pathsToRemove.push(p); }
    if (existing?.cover_url) { const p = pathFromPublicUrl(existing.cover_url); if (p) pathsToRemove.push(p); }
    if (pathsToRemove.length) await higherEdDb.storage.from(FILES_BUCKET).remove(pathsToRemove);

    const { error } = await higherEdDb.from('education_files').delete().eq('id', fileId);
    if (error) throw error;
    return res.status(200).json({ ok: true });
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { action } = req.body ?? {};

  // Public Files Library actions (no admin needed) — same behavior as before.
  if (action === 'list' || action === 'create' || action === 'delete') {
    try {
      const handled = await handleFileAction(action, req.body, res);
      if (handled) return handled;
    } catch (e: any) {
      return res.status(500).json({ error: e.message ?? 'Something went wrong' });
    }
  }

  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Admin login required' });

  try {
    // ── Universities ──────────────────────────────────────────
    if (action === 'create_university') {
      const { name, logoBase64, logoFileName } = req.body;
      if (!name) return res.status(400).json({ error: 'name is required' });

      let logo_url: string | null = null;
      if (logoBase64 && logoFileName) {
        logo_url = await uploadLogo(logoBase64, logoFileName, name);
      }

      const { data, error } = await higherEdDb
        .from('universities')
        .insert({ name, logo_url, created_by: admin.id })
        .select()
        .single();
      if (error) throw error;

      return res.status(200).json({ university: data });
    }

    if (action === 'update_university') {
      const { id, updates } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });

      const { data, error } = await higherEdDb
        .from('universities')
        .update(updates ?? {})
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      return res.status(200).json({ university: data });
    }

    if (action === 'delete_university') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });

      const { error } = await higherEdDb.from('universities').delete().eq('id', id);
      if (error) throw error;

      return res.status(200).json({ ok: true });
    }

    // ── University links ──────────────────────────────────────
    if (action === 'create_link') {
      const { university_id, platform_type, url, description, sort_order } = req.body;
      if (!university_id || !platform_type || !url) {
        return res.status(400).json({ error: 'university_id, platform_type and url are required' });
      }

      const { data, error } = await higherEdDb
        .from('university_links')
        .insert({ university_id, platform_type, url, description, sort_order: sort_order ?? 0 })
        .select()
        .single();
      if (error) throw error;

      return res.status(200).json({ link: data });
    }

    if (action === 'update_link') {
      const { id, updates } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });

      const { data, error } = await higherEdDb
        .from('university_links')
        .update(updates ?? {})
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      return res.status(200).json({ link: data });
    }

    if (action === 'delete_link') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });

      const { error } = await higherEdDb.from('university_links').delete().eq('id', id);
      if (error) throw error;

      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message ?? 'Something went wrong' });
  }
}
