import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Same bookshop/E-BookStore Supabase project the other api/ files use —
// this is where push subscriptions live for the whole app.
const BOOKSHOP_SUPABASE_URL = 'https://sahxijuxztcdncgoorun.supabase.co';
// SERVICE ROLE key — bypasses RLS entirely. This is the whole point of
// moving the save here: the browser's anon key was getting blocked by
// RLS with no policy in place, and rather than requiring a SQL/policy
// change, the write now happens server-side where RLS doesn't apply.
const BOOKSHOP_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhaHhpanV4enRjZG5jZ29vcnVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDI5MDAwMCwiZXhwIjoyMDk5ODY2MDAwfQ.VZa5ajKqABNbcBVq6nAJwnHxWa2NfEQr-ZdTff1wF5U';

const db = createClient(BOOKSHOP_SUPABASE_URL, BOOKSHOP_SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'POST') {
      const { user_id, endpoint, p256dh, auth } = req.body ?? {};
      if (!endpoint || !p256dh || !auth) {
        return res.status(400).json({ error: 'endpoint, p256dh and auth are required' });
      }
      const { error } = await db.from('otechy_push_subscriptions').upsert(
        { user_id: user_id ?? null, endpoint, p256dh, auth },
        { onConflict: 'endpoint' }
      );
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { endpoint } = req.body ?? {};
      if (!endpoint) return res.status(400).json({ error: 'endpoint is required' });
      const { error } = await db.from('otechy_push_subscriptions').delete().eq('endpoint', endpoint);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).end();
  } catch (e: any) {
    console.error('push-subscription error:', e);
    return res.status(500).json({ error: e.message ?? 'Unknown error' });
  }
}
