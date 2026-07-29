import { createClient } from '@supabase/supabase-js'

// Hardcoded on purpose — this is a SEPARATE Supabase project from both the
// main SchoraHub backend and the E-BookStore backend, isolated to AI Mode
// only. Same pattern as bookshopSupabase.ts.
const AI_MODE_SUPABASE_URL = 'https://jxsvepqrlmxddimkhwls.supabase.co'
const AI_MODE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4c3ZlcHFybG14ZGRpbWtod2xzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMTQ0NTcsImV4cCI6MjEwMDg5MDQ1N30.jTOFJTsPXPTK04X7nQBg6wCD2hbDGglftSEwfA5H1aY'

export const aiModeSupabase = createClient(AI_MODE_SUPABASE_URL, AI_MODE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // AI Mode has no login of its own — no session to persist
  },
  global: { headers: { 'X-Client-Info': 'schorahub-ai-mode' } },
})
