import { createClient } from '@supabase/supabase-js'

// Hardcoded per your instruction — Resources is split into THREE
// separate Supabase projects, one per education level (MSCE / JCE /
// Primary), instead of one shared Resources project. This is the JCE one.
// Same pattern as tutorsSupabase.ts, scholarshipsSupabase.ts, etc.
//
// This is the JCE Resources Supabase project — separate from the main
// SchoraHub project and from the other two Resources levels (MSCE/Primary).
const JCE_RESOURCES_SUPABASE_URL = 'https://ihvumdzfuxlqtxujsklf.supabase.co'
const JCE_RESOURCES_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodnVtZHpmdXhscXR4dWpza2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MDAyODIsImV4cCI6MjEwNTI3NjI4Mn0.Q5BCk6_NSaYtjkYz8zVDy-ay4O4BCJ92W4A1Q21e3dw'

export const jceResourcesSupabase = createClient(JCE_RESOURCES_SUPABASE_URL, JCE_RESOURCES_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // No login of its own — admin auth happens on the main project
  },
  global: { headers: { 'X-Client-Info': 'schorahub-resources-jce' } },
})
