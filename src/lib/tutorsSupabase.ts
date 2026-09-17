import { createClient } from '@supabase/supabase-js'

// Hardcoded per your instruction — this is a SEPARATE Supabase project from
// the main SchoraHub one, isolated to the Tutors section only. Same pattern
// as bookshopSupabase.ts, jobsSupabase.ts and aiModeSupabase.ts.
//
// ⚠️ PLACEHOLDER — you haven't created this Supabase project yet. Once you
// do (Project Settings → API), replace the two values below with the real
// ones. Until then this file safely falls back to a dummy project so the
// app doesn't crash — Tutors just won't load any data.
const TUTORS_SUPABASE_URL = 'https://placeholder.supabase.co'
const TUTORS_SUPABASE_ANON_KEY = 'placeholder'

export const tutorsSupabase = createClient(TUTORS_SUPABASE_URL, TUTORS_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // Tutors has no login of its own — admin auth happens on the main project
  },
  global: { headers: { 'X-Client-Info': 'schorahub-tutors' } },
})
