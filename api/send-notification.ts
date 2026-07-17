import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Hardcoded per your instruction — replace with your actual values.
// Generate VAPID keys once with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = 'YOUR-VAPID-PUBLIC-KEY';
const VAPID_PRIVATE_KEY = 'YOUR-VAPID-PRIVATE-KEY';
const BOOKSHOP_SUPABASE_URL = 'https://sahxijuxztcdncgoorun.supabase.co';
// Service-role key (NOT the anon key) — needed here to delete dead
// subscriptions server-side. Keep this file server-only, never import
// it from client code.
const BOOKSHOP_SUPABASE_SERVICE_ROLE_KEY = 'YOUR-SERVICE-ROLE-KEY';

webpush.setVapidDetails('mailto:support@schorahub.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const db = createClient(BOOKSHOP_SUPABASE_URL, BOOKSHOP_SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { title, body, anonId } = req.body ?? {};
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });

  try {
    let query = db.from('bookshop_push_subscriptions').select('*');
    if (anonId) query = query.eq('anon_id', anonId);
    const { data: subs, error } = await query;
    if (error) throw error;

    const payload = JSON.stringify({ title, body });
    await Promise.all((subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.from('bookshop_push_subscriptions').delete().eq('endpoint', s.endpoint);
        }
      }
    }));
    res.status(200).json({ sent: subs?.length ?? 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
