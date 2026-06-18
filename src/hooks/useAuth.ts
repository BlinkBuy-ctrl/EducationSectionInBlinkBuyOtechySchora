import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const ANON_ID_KEY = 'otechyschora_anon_id'

function getOrCreateAnonId(): string {
  let id = localStorage.getItem(ANON_ID_KEY)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(ANON_ID_KEY, id) }
  return id
}

export interface AnonUser { id: string; isAnon: true }

export interface AuthContextType {
  user: AnonUser
  profile: any | null
  isLoading: boolean
  setProfile: (p: any | null) => void
  ensureProfile: () => Promise<void>
  login: () => Promise<void>
  register: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function useAuthState(): AuthContextType {
  const anonId = useRef<string>(getOrCreateAnonId())
  const user: AnonUser = { id: anonId.current, isAnon: true }
  const [profile, setProfile] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const fetching = useRef(false)

  const fetchProfile = useCallback(async () => {
    if (fetching.current) return
    fetching.current = true
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', anonId.current).maybeSingle()
      if (data) setProfile(data)
    } finally { fetching.current = false; setIsLoading(false) }
  }, [])

  const ensureProfile = useCallback(async () => {
    const { error } = await supabase.from('profiles').upsert(
      { id: anonId.current, name: `User-${anonId.current.slice(0,6)}`, role: 'customer', is_anon: true },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    if (error) console.error('ensureProfile:', error)
    await fetchProfile()
  }, [fetchProfile])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  return { user, profile, isLoading, setProfile, ensureProfile, login: async()=>{}, register: async()=>{}, logout: async()=>{} }
}

export function useAuth() { return useContext(AuthContext) }
