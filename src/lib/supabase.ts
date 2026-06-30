import { createClient } from '@supabase/supabase-js'
import { getUsableLocalStorage } from '@/lib/storage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[SchoraHub] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing.\n' +
    'Add both keys to your .env file or Vercel environment variables.'
  )
}

const safeUrl = supabaseUrl || 'https://placeholder.supabase.co'
const safeKey = supabaseAnonKey || 'placeholder'

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'otechyschora_auth_token',
    // Falls back to in-memory (handled internally by supabase-js) if
    // localStorage is unavailable in a restricted WebView.
    storage: getUsableLocalStorage(),
  },
  realtime: { params: { eventsPerSecond: 10 }, timeout: 20000 },
  global: { headers: { 'X-Client-Info': 'schorahub-web' } },
})
