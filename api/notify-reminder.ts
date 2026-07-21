import type { VercelRequest, VercelResponse } from '@vercel/node';

// Rotates through these messages — one sent daily at 9 AM UTC.
// Index 0 (free PDF hook) appears every OTHER day; the rest fill the gaps.
const REMINDERS = [
  {
    title: "📚 Did you know?",
    body: "With SchoraHub you can get different PDFs for free — even offline once installed!",
    url: "/",
  },
  {
    title: "🎓 Study smarter with SchoraHub",
    body: "Download free past papers and ace your exams. Hundreds of resources available!",
    url: "/",
  },
  {
    title: "📚 Did you know?",
    body: "With SchoraHub you can get different PDFs for free — even offline once installed!",
    url: "/",
  },
  {
    title: "💡 SchoraHub Tip",
    body: "Find scholarships tailored for Malawian students — check the Scholarships tab now!",
    url: "/",
  },
  {
    title: "📚 Did you know?",
    body: "With SchoraHub you can get different PDFs for free — even offline once installed!",
    url: "/",
  },
  {
    title: "🏫 Tutors available near you",
    body: "Looking for a tutor? SchoraHub connects you with verified tutors across Malawi.",
    url: "/",
  },
  {
    title: "📚 Bookshops on SchoraHub",
    body: "Order physical books from verified Malawian bookstores — delivered to your door!",
    url: "/",
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel cron authenticates with CRON_SECRET env var automatically
  // For manual triggers, also accept x-internal-secret
  const isVercelCron  = req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
  const isInternalCall = req.headers['x-internal-secret'] === process.env.INTERNAL_SECRET;
  if (!isVercelCron && !isInternalCall) return res.status(401).end();

  // Pick a reminder — rotate daily by day-of-year so it doesn't repeat
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const reminder  = REMINDERS[dayOfYear % REMINDERS.length];

  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://schorahub.vercel.app'; // fallback to your live domain

    const response = await fetch(`${baseUrl}/api/send-app-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_SECRET ?? '',
      },
      body: JSON.stringify(reminder),
    });

    const result = await response.json();
    res.status(200).json({ reminder: reminder.title, ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
