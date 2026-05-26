import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export interface AuthContextType {
  user: User | null
  profile: any | null
  isLoading: boolean
  setProfile: (profile: any | null) => void
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
}

export interface RegisterData {
  email: string
  password: string
  name: string
  phone?: string
  role: 'customer' | 'worker' | 'both'
  location?: string
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
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  // FIX: Start false — no auth gate needed; resolve immediately
  const [isLoading, setIsLoading] = useState(false)

  const lastFetchedUserId = useRef<string | null>(null)
  const isFetchingRef = useRef(false)

  const fetchProfile = useCallback(async (userId: string, force = false): Promise<void> => {
    if (!force && lastFetchedUserId.current === userId) return
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) throw error
      lastFetchedUserId.current = userId
      setProfile(normalizeProfile(data as Record<string, unknown>))
    } catch (e) {
      console.error('Failed to fetch profile:', e)
    } finally {
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    // FIX: Silently try to restore existing session, no loading gate
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user && ['SIGNED_IN', 'USER_UPDATED', 'TOKEN_REFRESHED'].includes(event)) {
        fetchProfile(session.user.id, event === 'SIGNED_IN')
      }
      if (!session?.user) {
        lastFetchedUserId.current = null
        isFetchingRef.current = false
        setProfile(null)
      }
    })

    return () => { subscription.unsubscribe() }
  }, [fetchProfile])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }

  const register = async (data: RegisterData) => {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { name: data.name, phone: data.phone, role: data.role, location: data.location } },
    })
    if (error) throw new Error(error.message)
    if (signUpData.user && !signUpData.session) {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
      if (loginError) throw new Error(loginError.message)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    lastFetchedUserId.current = null
    isFetchingRef.current = false
    setProfile(null)
  }

  return { user, profile, isLoading, setProfile, login, register, logout }
}

export function useAuth() {
  return useContext(AuthContext)
}
