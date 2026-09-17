import { createClient } from '@supabase/supabase-js'

// Hardcoded per your instruction — this is a SEPARATE Supabase project from
// the main SchoraHub one, isolated to the Scholarships section only. Same
// pattern as bookshopSupabase.ts, jobsSupabase.ts and tutorsSupabase.ts.
//
// ⚠️ PLACEHOLDER — you haven't created this Supabase project yet. Once you
// do (Project Settings → API), replace the two values below with the real
// ones. Until then this file safely falls back to a dummy project so the
// app doesn't crash — Scholarships just won't load any data.
const SCHOLARSHIPS_SUPABASE_URL = 'https://placeholder.supabase.co'
const SCHOLARSHIPS_SUPABASE_ANON_KEY = 'placeholder'

export const scholarshipsSupabase = createClient(SCHOLARSHIPS_SUPABASE_URL, SCHOLARSHIPS_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // Scholarships has no login of its own — admin auth happens on the main project
  },
  global: { headers: { 'X-Client-Info': 'schorahub-scholarships' } },
})
