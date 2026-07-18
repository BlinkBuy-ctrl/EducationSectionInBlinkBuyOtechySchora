import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const BOOKSHOP_SUPABASE_URL = 'https://sahxijuxztcdncgoorun.supabase.co';
// Service-role key — bypasses RLS, server-only, never expose to the client.
const BOOKSHOP_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhaHhpanV4enRjZG5jZ29vcnVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDI5MDAwMCwiZXhwIjoyMDk5ODY2MDAwfQ.VZa5ajKqABNbcBVq6nAJwnHxWa2NfEQr-ZdTff1wF5U';
// Shared secret — only your admin panel (which is already behind your
// app's admin gate) knows this. Anyone without it gets 401, even with
// the public anon key. Generated randomly — you never need to type it,
// it's only compared byte-for-byte against what bookshops.ts sends.
const ADMIN_REVIEW_SECRET = 'GJf0-fxkRB2o6_VG8qassX4Qpi-90WEpQe0ruEevnJ4';

const db = createClient(BOOKSHOP_SUPABASE_URL, BOOKSHOP_SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  if (req.headers['x-admin-secret'] !== ADMIN_REVIEW_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { bookshopId, status } = req.body ?? {};
  if (!bookshopId || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'bookshopId and a valid status are required' });
  }

  const { error } = await db
    .from('bookshops')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', bookshopId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ ok: true });
}
