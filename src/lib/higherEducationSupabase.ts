import { createClient } from '@supabase/supabase-js'

// Hardcoded per your instruction — this is a SEPARATE Supabase project from
// the main SchoraHub one, dedicated to the Higher Education feature
// (universities, university_links, education_files). Same pattern as
// jobsSupabase.ts / bookshopSupabase.ts / aiModeSupabase.ts.
//
// Only the ANON key lives here — this file ships to the browser. All
// admin writes (create/update/delete university, upload a file's row)
// go through api/manage-higher-education.ts and api/manage-education-files.ts,
// which hold the SERVICE ROLE key server-side only. Reads (browsing
// universities, links, the files library) use this anon client directly —
// RLS on this project allows public select on all three tables.
const HIGHER_ED_SUPABASE_URL = 'https://miceczfibiewvijryzhe.supabase.co'
const HIGHER_ED_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pY2VjemZpYmlld3ZpanJ5emhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNDgwNTcsImV4cCI6MjEwNTgyNDA1N30.l8u8UgNN32YJXJAJS7TK9dC4-uehO2IS3RLcrNPnqMA'

export const higherEdSupabase = createClient(HIGHER_ED_SUPABASE_URL, HIGHER_ED_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // Higher Education has no login of its own — admin auth happens on the main project
  },
  global: { headers: { 'X-Client-Info': 'schorahub-higher-education' } },
})
