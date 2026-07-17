import { createClient } from '@supabase/supabase-js'

// Hardcoded per your instruction — this is a SEPARATE Supabase project from
// the main SchoraHub one, isolated to the E-BookStore section only.
// Replace these two with your actual E-BookStore Supabase project values
// (Project Settings → API).
const BOOKSHOP_SUPABASE_URL = 'https://sahxijuxztcdncgoorun.supabase.co'
const BOOKSHOP_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhaHhpanV4enRjZG5jZ29vcnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyOTAwMDAsImV4cCI6MjA5OTg2NjAwMH0.7omdudPXiT0_4Ff7pHb4Vwc1GXHcDS6ysN1_MIXipB0'

export const bookshopSupabase = createClient(BOOKSHOP_SUPABASE_URL, BOOKSHOP_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'ebookstore_auth_token', // separate session from main app auth
  },
  global: { headers: { 'X-Client-Info': 'schorahub-ebookstore' } },
})
