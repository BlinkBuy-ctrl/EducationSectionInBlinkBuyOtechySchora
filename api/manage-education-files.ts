import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ── Jobs project (service role — bypasses RLS, server-only) ───────────────
// Same project as manage-jobs.ts. Education files live here too, per
// instruction: reuse the Jobs Supabase project, don't spin up a 4th one.
const JOBS_SUPABASE_URL = 'https://mgsdzardxtaiuczfarsi.supabase.co';
const JOBS_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nc2R6YXJkeHRhaXVjemZhcnNpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODI0OTE2OSwiZXhwIjoyMTAzODI1MTY5fQ.b01Dxt9KTV61DMyDRPeL0xn4EYfraBX7thu37403HEk';
const jobsDb = createClient(JOBS_SUPABASE_URL, JOBS_SUPABASE_SERVICE_ROLE_KEY);

const BUCKET = 'education-files';

// NOTE: this endpoint never receives raw file bytes. The browser uploads
// files directly to Supabase Storage (public insert policy on the
// education-files bucket — see education_schema_v4.sql), then calls this
// endpoint with just the resulting URLs + metadata. That split is what
// lets big files bypass Vercel's ~4.5MB serverless body-size cap.

interface EducationFileInput {
  university_id: string;
  program: string;
  category: string;
  title: string;
  uploaded_by?: string | null;
  file_url: string;
  cover_url?: string | null;
  file_type: string;
}

/** Recovers a storage object path from one of this bucket's public URLs,
 *  so we can delete the underlying object alongside its row. */
function pathFromPublicUrl(fileUrl: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  return fileUrl.slice(idx + marker.length);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { action } = req.body ?? {};

  try {
    if (action === 'list') {
      const { university_id, program, category } = req.body ?? {};
      let query = jobsDb.from('education_files').select('*').order('created_at', { ascending: false });
      if (university_id) query = query.eq('university_id', university_id);
      if (program) query = query.eq('program', program);
      if (category) query = query.eq('category', category);

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json({ files: data });
    }

    if (action === 'create') {
      const { file } = req.body as { file: EducationFileInput };

      if (!file?.university_id || !file?.program || !file?.category || !file?.title || !file?.file_url || !file?.file_type) {
        return res.status(400).json({ error: 'university_id, program, category, title, file_url and file_type are required' });
      }

      const { data, error } = await jobsDb
        .from('education_files')
        .insert({
          university_id: file.university_id,
          program: file.program.trim(),
          category: file.category.trim(),
          title: file.title.trim(),
          uploaded_by: file.uploaded_by?.trim() || null,
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
      const { fileId } = req.body ?? {};
      if (!fileId) return res.status(400).json({ error: 'fileId required' });

      const { data: existing, error: fetchErr } = await jobsDb
        .from('education_files')
        .select('file_url, cover_url')
        .eq('id', fileId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      const pathsToRemove: string[] = [];
      if (existing?.file_url) {
        const p = pathFromPublicUrl(existing.file_url);
        if (p) pathsToRemove.push(p);
      }
      if (existing?.cover_url) {
        const p = pathFromPublicUrl(existing.cover_url);
        if (p) pathsToRemove.push(p);
      }
      if (pathsToRemove.length) {
        await jobsDb.storage.from(BUCKET).remove(pathsToRemove);
      }

      const { error } = await jobsDb.from('education_files').delete().eq('id', fileId);
      if (error) throw error;

      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message ?? 'Something went wrong' });
  }
}
