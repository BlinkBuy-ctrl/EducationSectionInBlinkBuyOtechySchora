import { createClient } from '@supabase/supabase-js'

// Hardcoded per your instruction — this is a SEPARATE Supabase project from
// the main SchoraHub one, isolated to the Adverts section only (video reels,
// reel reactions, and the scheduled ad overlay config). Same pattern as
// bookshopSupabase.ts, jobsSupabase.ts, tutorsSupabase.ts and
// scholarshipsSupabase.ts.
//
// ⚠️ PLACEHOLDER — you haven't created this Supabase project yet. Once you
// do (Project Settings → API), replace the two values below with the real
// ones. Until then this file safely falls back to a dummy project so the
// app doesn't crash — Adverts just won't load any data.
const ADVERTS_SUPABASE_URL = 'https://placeholder.supabase.co'
const ADVERTS_SUPABASE_ANON_KEY = 'placeholder'

export const advertsSupabase = createClient(ADVERTS_SUPABASE_URL, ADVERTS_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // Adverts has no login of its own — admin auth happens on the main project
  },
  global: { headers: { 'X-Client-Info': 'schorahub-adverts' } },
})
