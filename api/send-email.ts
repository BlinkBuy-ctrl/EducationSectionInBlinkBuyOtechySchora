import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

// Get a free API key at https://resend.com — sign up, no card required,
// then Dashboard > API Keys > Create API Key. Free tier: 3,000 emails/month.
const RESEND_API_KEY = 're_W6EVNonB_PEyFas4a5dkd3zzwJFjKTjDK';
const resend = new Resend(RESEND_API_KEY);

// Resend's shared test sender — works immediately with zero setup. Swap to
// your own verified domain later (Resend > Domains > add schorahub.app)
// for a more trusted "from" address once you're ready.
const FROM = 'SchoraHub E-BookStore <onboarding@resend.dev>';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { to, subject, html } = req.body ?? {};
  if (!to || !subject || !html) return res.status(400).json({ error: 'to, subject, html required' });

  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) throw error;
    res.status(200).json({ sent: true, id: data?.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
