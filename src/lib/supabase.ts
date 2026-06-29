import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[SchoraHub] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing.\n' +
    'Add both keys to your .env file or Vercel environment variables.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'schorahub_auth_token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  realtime: { params: { eventsPerSecond: 10 }, timeout: 20000 },
  global: { headers: { 'X-Client-Info': 'schorahub-web' } },
})
