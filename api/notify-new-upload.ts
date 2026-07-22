import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Same VAPID keys used everywhere else in the app.
const VAPID_PUBLIC_KEY  = 'BGIoLhtHS59h97l8zrnMNnVKRM6gGcArrow9INvV8QGRz8Un7VJxUdOBo3bBkowsfmj86Lh4w2LK_xEzb2-xvOc';
const VAPID_PRIVATE_KEY = 'Gvy6zfX9tEnu_94iPvPfXuhGJAvQ92fNVgEFEOYX0UI';

// Push subscriptions live in the E-BookStore/bookshop Supabase project.
const BOOKSHOP_SUPABASE_URL = 'https://sahxijuxztcdncgoorun.supabase.co';
const BOOKSHOP_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhaHhpanV4enRjZG5jZ29vcnVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDI5MDAwMCwiZXhwIjoyMDk5ODY2MDAwfQ.VZa5ajKqABNbcBVq6nAJwnHxWa2NfEQr-ZdTff1wF5U';

webpush.setVapidDetails('mailto:support@schorahub.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const db = createClient(BOOKSHOP_SUPABASE_URL, BOOKSHOP_SUPABASE_SERVICE_ROLE_KEY);

// Deliberately UNAUTHENTICATED — this is the endpoint the browser calls
// right after a resource upload finishes. It never accepts a secret
// (secrets can't live safely in client JS anyway) and it never lets the
// caller target a specific user — it's a broadcast-only, fixed-shape ping.
// Same trust model as send-notification.ts, which already works this way.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { title, body, url } = req.body ?? {};
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });

  try {
    const { data: subs, error } = await db.from('otechy_push_subscriptions').select('*');
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
