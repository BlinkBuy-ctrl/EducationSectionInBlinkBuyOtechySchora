import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Same VAPID keys as send-notification.ts (one key pair for the whole app)
const VAPID_PUBLIC_KEY  = 'BGIoLhtHS59h97l8zrnMNnVKRM6gGcArrow9INvV8QGRz8Un7VJxUdOBo3bBkowsfmj86Lh4w2LK_xEzb2-xvOc';
const VAPID_PRIVATE_KEY = 'Gvy6zfX9tEnu_94iPvPfXuhGJAvQ92fNVgEFEOYX0UI';

// Uses the E-BookStore/bookshop Supabase project — push subscriptions live
// there for the whole app, separate from the main SchoraHub DB.
const BOOKSHOP_SUPABASE_URL = 'https://sahxijuxztcdncgoorun.supabase.co';
const BOOKSHOP_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhaHhpanV4enRjZG5jZ29vcnVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDI5MDAwMCwiZXhwIjoyMDk5ODY2MDAwfQ.VZa5ajKqABNbcBVq6nAJwnHxWa2NfEQr-ZdTff1wF5U';

webpush.setVapidDetails('mailto:support@schorahub.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const db = createClient(BOOKSHOP_SUPABASE_URL, BOOKSHOP_SUPABASE_SERVICE_ROLE_KEY);

// Internal secret — set INTERNAL_SECRET in Vercel env vars
// so only your own APIs can call this endpoint
const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  if (INTERNAL_SECRET && req.headers['x-internal-secret'] !== INTERNAL_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { title, body, url, userId } = req.body ?? {};
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });

  try {
    // If userId provided → notify only that user; otherwise blast everyone
    let query = db.from('otechy_push_subscriptions').select('*');
    if (userId) query = query.eq('user_id', userId);
    const { data: subs, error } = await query;
    if (error) throw error;

    const payload = JSON.stringify({ title, body, url: url ?? '/' });
    let sent = 0;

    await Promise.all((subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        sent++;
      } catch (err: any) {
        // Remove dead subscriptions (uninstalled / expired)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.from('otechy_push_subscriptions').delete().eq('endpoint', s.endpoint);
        }
      }
    }));

    res.status(200).json({ sent });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
