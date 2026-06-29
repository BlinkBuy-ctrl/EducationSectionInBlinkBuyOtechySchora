import { createClient } from '@supabase/supabase-js'

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

// Safe localStorage accessor — avoids crashes in restricted WebView environments
function getStorage(): Storage | undefined {
  try {
    const s = window.localStorage
    // Verify it is actually usable (throws in some privacy modes)
    s.setItem('__test__', '1')
    s.removeItem('__test__')
    return s
  } catch {
    return undefined
  }
}

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'otechyschora_auth_token',
    // Falls back to in-memory if localStorage is unavailable (e.g. restricted WebView)
    storage: getStorage(),
  },
  realtime: { params: { eventsPerSecond: 10 }, timeout: 20000 },
  global: { headers: { 'X-Client-Info': 'schorahub-web' } },
})
