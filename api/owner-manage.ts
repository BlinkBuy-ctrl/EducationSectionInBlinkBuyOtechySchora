import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const BOOKSHOP_SUPABASE_URL = 'https://sahxijuxztcdncgoorun.supabase.co';
const BOOKSHOP_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhaHhpanV4enRjZG5jZ29vcnVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDI5MDAwMCwiZXhwIjoyMDk5ODY2MDAwfQ.VZa5ajKqABNbcBVq6nAJwnHxWa2NfEQr-ZdTff1wF5U';

const db = createClient(BOOKSHOP_SUPABASE_URL, BOOKSHOP_SUPABASE_SERVICE_ROLE_KEY);

async function getUserFromAuthHeader(req: VercelRequest) {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

// Confirms the given bookshop is actually owned by this user before any write.
async function assertOwnsShop(userId: string, bookshopId: string) {
  const { data, error } = await db.from('bookshops').select('id, owner_user_id').eq('id', bookshopId).maybeSingle();
  if (error || !data) throw new Error('Bookshop not found');
  if (data.owner_user_id !== userId) throw new Error('You do not own this bookshop');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await getUserFromAuthHeader(req);
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { action } = req.body ?? {};

  try {
    if (action === 'claim') {
      // Link the shop that was applied for with this email to this login,
      // only if it's approved and not already claimed by someone else.
      const { data: shop, error: findErr } = await db
        .from('bookshops')
        .select('*')
        .eq('owner_email', user.email)
        .eq('status', 'approved')
        .is('owner_user_id', null)
        .maybeSingle();
      if (findErr) throw findErr;

      if (!shop) {
        // Maybe already claimed by this same user — return it if so.
        const { data: already } = await db.from('bookshops').select('*').eq('owner_user_id', user.id).maybeSingle();
        if (already) return res.status(200).json({ bookshop: already });
        return res.status(404).json({ error: 'No approved bookshop found for this email yet.' });
      }

      const { data: updated, error: updErr } = await db
        .from('bookshops').update({ owner_user_id: user.id }).eq('id', shop.id).select().single();
      if (updErr) throw updErr;
      return res.status(200).json({ bookshop: updated });
    }

    if (action === 'update_shop') {
      const { bookshopId, patch } = req.body;
      await assertOwnsShop(user.id, bookshopId);
      const { error } = await db.from('bookshops').update(patch).eq('id', bookshopId);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete_shop') {
      const { bookshopId } = req.body;
      await assertOwnsShop(user.id, bookshopId);
      const { error } = await db.from('bookshops').delete().eq('id', bookshopId);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === 'add_book') {
      const { bookshopId, book } = req.body;
      await assertOwnsShop(user.id, bookshopId);
      const { error } = await db.from('bookshop_books').insert({ ...book, bookshop_id: bookshopId });
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === 'update_book') {
      const { bookshopId, bookId, patch } = req.body;
      await assertOwnsShop(user.id, bookshopId);
      const { error } = await db.from('bookshop_books').update(patch).eq('id', bookId).eq('bookshop_id', bookshopId);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete_book') {
      const { bookshopId, bookId } = req.body;
      await assertOwnsShop(user.id, bookshopId);
      const { error } = await db.from('bookshop_books').delete().eq('id', bookId).eq('bookshop_id', bookshopId);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
}
