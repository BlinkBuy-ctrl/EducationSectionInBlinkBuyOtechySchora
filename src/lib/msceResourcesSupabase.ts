import { createClient } from '@supabase/supabase-js'

// Hardcoded per your instruction — Resources is now split into THREE
// separate Supabase projects, one per education level (MSCE / JCE /
// Primary), instead of one shared Resources project. This is the MSCE one.
// Same pattern as tutorsSupabase.ts, scholarshipsSupabase.ts, etc.
//
// This is the MSCE Resources Supabase project — separate from the main
// SchoraHub project and from the other two Resources levels (JCE/Primary).
const MSCE_RESOURCES_SUPABASE_URL = 'https://hkevdlmiamffezaubzpl.supabase.co'
const MSCE_RESOURCES_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrZXZkbG1pYW1mZmV6YXVienBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2OTYyMzIsImV4cCI6MjEwNTI3MjIzMn0.Yh6zKDA_pWOYFqlgdl9_NJ1r--u4EX_-ohpY_U8EdXI'

export const msceResourcesSupabase = createClient(MSCE_RESOURCES_SUPABASE_URL, MSCE_RESOURCES_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // No login of its own — admin auth happens on the main project
  },
  global: { headers: { 'X-Client-Info': 'schorahub-resources-msce' } },
})
