import type { VercelRequest, VercelResponse } from '@vercel/node';

// Plain reachability + title check — no AI, nothing that can hit a rate
// limit. Just confirms the link you pasted is a real, live page before you
// post it, and grabs the page title so you can eyeball that it's the right
// one.
//
// Gated the same way as manage-jobs.ts (admin bearer token) so this never
// becomes an open URL-fetch proxy for anyone poking at the API directly.
import { createClient } from '@supabase/supabase-js';

const MAIN_SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const MAIN_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

async function verifyAdmin(req: VercelRequest): Promise<boolean> {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !MAIN_SUPABASE_URL || !MAIN_SUPABASE_ANON_KEY) return false;

  const asUser = createClient(MAIN_SUPABASE_URL, MAIN_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await asUser.auth.getUser(token);
  if (userErr || !userData.user) return false;

  const { data: profile } = await asUser.from('profiles').select('is_admin').eq('id', userData.user.id).maybeSingle();
  return !!profile?.is_admin;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await verifyAdmin(req))) return res.status(401).json({ error: 'Admin login required' });

  const { url } = req.body ?? {};
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url required' });

  let target: URL;
  try {
    target = new URL(url);
    if (!['http:', 'https:'].includes(target.protocol)) throw new Error('bad protocol');
  } catch {
    return res.status(200).json({ valid: false, reason: 'That doesn\'t look like a valid link.' });
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

    if (!response.ok) {
      return res.status(200).json({ valid: false, reason: `Link responded with status ${response.status}.` });
    }

    // Only read a small chunk — just enough to find <title>, not the whole page.
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

    return res.status(200).json({ valid: true, finalUrl: response.url, title });
  } catch (e: any) {
    clearTimeout(timeout);
    const reason = e.name === 'AbortError' ? 'Link took too long to respond.' : 'Could not reach that link.';
    return res.status(200).json({ valid: false, reason });
  }
}
