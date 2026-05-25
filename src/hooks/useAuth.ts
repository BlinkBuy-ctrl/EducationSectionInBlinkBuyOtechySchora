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
  const [isLoading, setIsLoading] = useState(true)

  const lastFetchedUserId = useRef<string | null>(null)
  const isFetchingRef = useRef(false)
  const initResolvedRef = useRef(false)

  const fetchProfile = useCallback(async (userId: string, force = false): Promise<void> => {
    if (!force && lastFetchedUserId.current === userId) return
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .abortSignal(controller.signal)
      clearTimeout(timer)
      if (error) throw error
      lastFetchedUserId.current = userId
      setProfile(normalizeProfile(data as Record<string, unknown>))
    } catch (e) {
      console.error('Failed to fetch profile:', e)
      setProfile((prev: any) => prev ?? null)
    } finally {
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (!initResolvedRef.current) {
        initResolvedRef.current = true
        setIsLoading(false)
      }
    }, 10000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        if (['INITIAL_SESSION', 'SIGNED_IN', 'USER_UPDATED', 'TOKEN_REFRESHED'].includes(event)) {
          const force = event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN'
          await fetchProfile(session.user.id, force)
        }
      } else {
        lastFetchedUserId.current = null
        isFetchingRef.current = false
        setProfile(null)
      }
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
        if (!initResolvedRef.current) {
          initResolvedRef.current = true
          clearTimeout(safetyTimer)
          setIsLoading(false)
        }
      }
    })

    return () => { clearTimeout(safetyTimer); subscription.unsubscribe() }
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
