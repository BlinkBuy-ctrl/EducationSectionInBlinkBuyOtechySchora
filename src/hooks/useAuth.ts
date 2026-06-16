import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ── Anonymous identity ─────────────────────────────────────────────────────
// A UUID is generated once and persisted in localStorage.
// On first use (upload/post), a row is auto-inserted into `profiles`.
// No login, no register, no password ever required.

const ANON_ID_KEY = 'otechyschora_anon_id'

function getOrCreateAnonId(): string {
  let id = localStorage.getItem(ANON_ID_KEY)
  if (!id) {
    // crypto.randomUUID is available in all modern browsers
    id = crypto.randomUUID()
    localStorage.setItem(ANON_ID_KEY, id)
  }
  return id
}

export interface AnonUser {
  id: string
  isAnon: true
}

export interface AuthContextType {
  user: AnonUser
  profile: any | null
  isLoading: boolean
  setProfile: (profile: any | null) => void
  /** No-op stubs kept for backward compat — nothing calls these anymore */
  login: () => Promise<void>
  register: () => Promise<void>
  logout: () => Promise<void>
  /** Call this before the first upload/post to ensure the profile row exists */
  ensureProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType)

function normalizeProfile(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key in data) {
    const camel = key.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase())
    out[camel] = data[key]
  }
  return out
}

export function useAuthState(): AuthContextType {
  // Stable anonymous user — never null, always has an id
  const anonId = useRef<string>(getOrCreateAnonId())
  const user: AnonUser = { id: anonId.current, isAnon: true }

  const [profile, setProfile] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isFetchingRef = useRef(false)

  const fetchProfile = useCallback(async (): Promise<void> => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', anonId.current)
        .maybeSingle()
      if (!error && data) {
        setProfile(normalizeProfile(data as Record<string, unknown>))
      }
    } catch (e) {
      console.error('Failed to fetch profile:', e)
    } finally {
      isFetchingRef.current = false
      setIsLoading(false)
    }
  }, [])

  /**
   * Upserts a profile row the first time the user does anything that writes to
   * the DB (upload, purchase, bookmark, tutor registration).
   * Safe to call multiple times — upsert is idempotent.
   */
  const ensureProfile = useCallback(async (): Promise<void> => {
    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id:         anonId.current,
          name:       `User-${anonId.current.slice(0, 6)}`,
          role:       'customer',
          is_anon:    true,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )
    if (error) console.error('ensureProfile error:', error)
    // Re-fetch so the UI shows the new profile
    await fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // No-op stubs — kept so any residual call sites don't throw
  const login    = async () => {}
  const register = async () => {}
  const logout   = async () => {}

  return { user, profile, isLoading, setProfile, login, register, logout, ensureProfile }
}

export function useAuth() {
  return useContext(AuthContext)
}
