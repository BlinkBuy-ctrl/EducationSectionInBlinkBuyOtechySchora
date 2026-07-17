import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Hardcoded per your instruction — replace with your actual values.
// Generate VAPID keys once with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = 'BGIoLhtHS59h97l8zrnMNnVKRM6gGcArrow9INvV8QGRz8Un7VJxUdOBo3bBkowsfmj86Lh4w2LK_xEzb2-xvOc';
const VAPID_PRIVATE_KEY = 'Gvy6zfX9tEnu_94iPvPfXuhGJAvQ92fNVgEFEOYX0UI';
const BOOKSHOP_SUPABASE_URL = 'https://sahxijuxztcdncgoorun.supabase.co';
// Service-role key (NOT the anon key) — needed here to delete dead
// subscriptions server-side. Keep this file server-only, never import
// it from client code.
const BOOKSHOP_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhaHhpanV4enRjZG5jZ29vcnVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDI5MDAwMCwiZXhwIjoyMDk5ODY2MDAwfQ.VZa5ajKqABNbcBVq6nAJwnHxWa2NfEQr-ZdTff1wF5U';

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
