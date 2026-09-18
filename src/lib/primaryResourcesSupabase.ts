import { createClient } from '@supabase/supabase-js'

// Hardcoded per your instruction — Resources is split into THREE
// separate Supabase projects, one per education level (MSCE / JCE /
// Primary), instead of one shared Resources project. This is the Primary
// one. Same pattern as tutorsSupabase.ts, scholarshipsSupabase.ts, etc.
//
// This is the Primary Resources Supabase project — separate from the main
// SchoraHub project and from the other two Resources levels (MSCE/JCE).
const PRIMARY_RESOURCES_SUPABASE_URL = 'https://waehfsimngqowbwbkhwd.supabase.co'
const PRIMARY_RESOURCES_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhZWhmc2ltbmdxb3did2JraHdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MDU0NjcsImV4cCI6MjEwNTI4MTQ2N30.ssrbgC_ONjWUFVXVYdeuxGr5-_SDpSCwmqiVrWnScqA'

export const primaryResourcesSupabase = createClient(PRIMARY_RESOURCES_SUPABASE_URL, PRIMARY_RESOURCES_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // No login of its own — admin auth happens on the main project
  },
  global: { headers: { 'X-Client-Info': 'schorahub-resources-primary' } },
})
