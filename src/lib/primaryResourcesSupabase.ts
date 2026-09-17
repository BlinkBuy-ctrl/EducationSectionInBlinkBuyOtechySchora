import { createClient } from '@supabase/supabase-js'

// Hardcoded per your instruction — Resources is now split into THREE
// separate Supabase projects, one per education level (MSCE / JCE /
// Primary), instead of one shared Resources project. This is the Primary
// one. Same pattern as tutorsSupabase.ts, scholarshipsSupabase.ts, etc.
//
// ⚠️ PLACEHOLDER — you haven't created this Supabase project yet. Once you
// do (Project Settings → API), replace the two values below with the real
// ones. Until then this file safely falls back to a dummy project so the
// app doesn't crash — Primary resources just won't load any data.
const PRIMARY_RESOURCES_SUPABASE_URL = 'https://placeholder.supabase.co'
const PRIMARY_RESOURCES_SUPABASE_ANON_KEY = 'placeholder'

export const primaryResourcesSupabase = createClient(PRIMARY_RESOURCES_SUPABASE_URL, PRIMARY_RESOURCES_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // No login of its own — admin auth happens on the main project
  },
  global: { headers: { 'X-Client-Info': 'schorahub-resources-primary' } },
})
