import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { AppUser, CompanySetupInput, UserRole } from '../types'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type AuthContextValue = {
  user: AppUser | null
  loading: boolean
  configured: boolean
  demoEnabled: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  enterDemo: () => void
  completeSetup: (settings: CompanySetupInput) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const demoStorageKey = 'legacy-hotshot-demo-user'

const demoUser: AppUser = {
  id: 'demo-owner',
  email: 'legacyhsoffice@gmail.com',
  fullName: 'Jared Guinn',
  role: 'owner',
  companyId: 'demo-company',
  setupComplete: true,
  demo: true,
}

type ProfileRow = {
  full_name: string | null
  role: UserRole
  company_id: string | null
  setup_complete: boolean | null
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const demoEnabled = import.meta.env.VITE_ENABLE_DEMO_MODE !== 'false'

  const loadProfile = useCallback(async (authUser: { id: string; email?: string }) => {
    if (!supabase) return

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, role, company_id, setup_complete')
      .eq('id', authUser.id)
      .single<ProfileRow>()

    if (error) throw error

    setUser({
      id: authUser.id,
      email: authUser.email ?? '',
      fullName: data.full_name || authUser.email?.split('@')[0] || 'User',
      role: data.role,
      companyId: data.company_id,
      setupComplete: Boolean(data.setup_complete),
    })
  }, [])

  useEffect(() => {
    let active = true

    const initialize = async () => {
      try {
        if (!supabase) {
          const hasDemoSession = localStorage.getItem(demoStorageKey) === 'active'
          if (hasDemoSession && active) setUser(demoUser)
          return
        }

        const { data } = await supabase.auth.getSession()
        if (data.session?.user && active) await loadProfile(data.session.user)
      } catch (error) {
        console.error('Unable to initialize authentication', error)
      } finally {
        if (active) setLoading(false)
      }
    }

    initialize()

    const authSubscription = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      if (!session?.user) {
        setUser(null)
        setLoading(false)
        return
      }
      loadProfile(session.user).catch((error) => {
        console.error('Unable to load profile', error)
        setUser(null)
      })
    })

    return () => {
      active = false
      authSubscription?.data.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not connected. Use Preview Demo or add environment variables.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    localStorage.removeItem(demoStorageKey)
    if (supabase && user && !user.demo) await supabase.auth.signOut()
    setUser(null)
  }, [user])

  const enterDemo = useCallback(() => {
    localStorage.setItem(demoStorageKey, 'active')
    setUser(demoUser)
    setLoading(false)
  }, [])

  const completeSetup = useCallback(async (settings: CompanySetupInput) => {
    if (!user) return
    if (!supabase || user.demo) {
      localStorage.setItem('legacy-hotshot-demo-company', JSON.stringify(settings))
      setUser((current) => current ? { ...current, setupComplete: true } : current)
      return
    }

    const { data, error } = await supabase.rpc('complete_owner_setup', { requested_settings: settings })
    if (error) throw error
    setUser((current) => current ? {
      ...current,
      companyId: typeof data === 'string' ? data : current.companyId,
      setupComplete: true,
    } : current)
  }, [user])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    configured: isSupabaseConfigured,
    demoEnabled,
    signIn,
    signOut,
    enterDemo,
    completeSetup,
  }), [user, loading, demoEnabled, signIn, signOut, enterDemo, completeSetup])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
