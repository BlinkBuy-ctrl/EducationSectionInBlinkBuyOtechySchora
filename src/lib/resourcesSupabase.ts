import { createClient } from '@supabase/supabase-js'

// Hardcoded per your instruction — this is a SEPARATE Supabase project from
// the main SchoraHub one, isolated to the Resources section only (past
// papers, textbooks, notes, purchases, bookmarks, and ratings/reviews on
// resources). Same pattern as bookshopSupabase.ts, jobsSupabase.ts,
// tutorsSupabase.ts, scholarshipsSupabase.ts and advertsSupabase.ts.
//
// ⚠️ PLACEHOLDER — you haven't created this Supabase project yet. Once you
// do (Project Settings → API), replace the two values below with the real
// ones. Until then this file safely falls back to a dummy project so the
// app doesn't crash — Resources just won't load any data.
const RESOURCES_SUPABASE_URL = 'https://placeholder.supabase.co'
const RESOURCES_SUPABASE_ANON_KEY = 'placeholder'

export const resourcesSupabase = createClient(RESOURCES_SUPABASE_URL, RESOURCES_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // Resources has no login of its own — admin auth happens on the main project
  },
  global: { headers: { 'X-Client-Info': 'schorahub-resources' } },
})
