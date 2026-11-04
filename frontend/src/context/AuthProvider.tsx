import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowRight, LockKeyhole, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AuthContext, GUEST_RESTRICTION_MESSAGE, type AuthProfile, type AuthRole, type AuthContextValue } from './authContext'
import { apiRequest } from '../lib/api'

function readProfile(key: string): AuthProfile | null {
  try {
    const value = sessionStorage.getItem(key)
    return value ? JSON.parse(value) as AuthProfile : null
  } catch {
    return null
  }
}

function initialAuth() {
  if (sessionStorage.getItem('sandiego-admin-token')) return { role: 'admin' as AuthRole, profile: readProfile('sandiego-admin-profile') }
  if (sessionStorage.getItem('sandiego-customer-token')) return { role: 'customer' as AuthRole, profile: readProfile('sandiego-customer-profile') }
  return { role: 'guest' as AuthRole, profile: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState(initialAuth)
  const [ready, setReady] = useState(() => !sessionStorage.getItem('sandiego-admin-token') && !sessionStorage.getItem('sandiego-customer-token'))
  const [authPromptOpen, setAuthPromptOpen] = useState(false)

  useEffect(() => {
    const adminToken = sessionStorage.getItem('sandiego-admin-token')
    const customerToken = sessionStorage.getItem('sandiego-customer-token')
    const token = adminToken || customerToken
    if (!token) return

    const isAdmin = Boolean(adminToken)
    const endpoint = isAdmin ? '/auth/admin/me' : '/auth/me'
    apiRequest<{ admin?: AuthProfile; user?: AuthProfile }>(endpoint, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        const serverProfile = isAdmin ? response.admin : response.user
        if (!serverProfile) throw new Error('The account session could not be verified.')
        const savedProfile = readProfile(isAdmin ? 'sandiego-admin-profile' : 'sandiego-customer-profile')
        const profile = savedProfile?.id === serverProfile.id ? { ...serverProfile, ...savedProfile } : serverProfile
        setAuth({ role: isAdmin ? 'admin' : 'customer', profile })
      })
      .catch(() => {
        sessionStorage.removeItem('sandiego-admin-token')
        sessionStorage.removeItem('sandiego-admin-profile')
        sessionStorage.removeItem('sandiego-customer-token')
        sessionStorage.removeItem('sandiego-customer-profile')
        setAuth({ role: 'guest', profile: null })
      })
      .finally(() => setReady(true))
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    ...auth,
    ready,
    authPromptOpen,
    signInCustomer: (token, profile) => {
      sessionStorage.removeItem('sandiego-admin-token')
      sessionStorage.removeItem('sandiego-admin-profile')
      sessionStorage.setItem('sandiego-customer-token', token)
      sessionStorage.setItem('sandiego-customer-profile', JSON.stringify(profile))
      setAuth({ role: 'customer', profile })
      setReady(true)
    },
    signInAdmin: (token, profile) => {
      sessionStorage.removeItem('sandiego-customer-token')
      sessionStorage.removeItem('sandiego-customer-profile')
      sessionStorage.setItem('sandiego-admin-token', token)
      sessionStorage.setItem('sandiego-admin-profile', JSON.stringify(profile))
      setAuth({ role: 'admin', profile })
      setReady(true)
    },
    updateProfile: (updates) => {
      setAuth((current) => {
        if (!current.profile) return current
        const profile = { ...current.profile, ...updates }
        const storageKey = current.role === 'admin' ? 'sandiego-admin-profile' : 'sandiego-customer-profile'
        sessionStorage.setItem(storageKey, JSON.stringify(profile))
        return { ...current, profile }
      })
    },
    signOut: () => {
      sessionStorage.removeItem('sandiego-admin-token')
      sessionStorage.removeItem('sandiego-admin-profile')
      sessionStorage.removeItem('sandiego-customer-token')
      sessionStorage.removeItem('sandiego-customer-profile')
      setAuth({ role: 'guest', profile: null })
      setReady(true)
    },
    requestUserAccess: () => {
      if (auth.role === 'customer') return true
      setAuthPromptOpen(true)
      return false
    },
    closeAuthPrompt: () => setAuthPromptOpen(false),
  }), [auth, authPromptOpen, ready])

  return (
    <AuthContext.Provider value={value}>
      {children}
      {authPromptOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthPromptOpen(false) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="guest-gate-title" className="relative w-full max-w-[440px] border border-[#D4AF37]/40 bg-[#10110E] p-6 text-white shadow-2xl shadow-black/50 sm:p-8">
            <button type="button" aria-label="Close sign-in prompt" onClick={() => setAuthPromptOpen(false)} className="absolute right-4 top-4 flex size-8 items-center justify-center border border-white/15 text-white/60 hover:border-[#D4AF37] hover:text-[#E5C75E]"><X size={15} /></button>
            <span className="flex size-10 items-center justify-center border border-[#D4AF37]/50 text-[#D4AF37]"><LockKeyhole size={17} /></span>
            <p className="mt-5 text-[9px] uppercase tracking-[0.2em] text-[#E5C75E]">A little closer</p>
            <h2 id="guest-gate-title" className="mt-2 max-w-[340px] font-serif text-[24px] leading-snug">An account makes it yours.</h2>
            <p className="mt-3 text-[11px] leading-5 text-white/60">{GUEST_RESTRICTION_MESSAGE}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row"><Link to="/account" onClick={() => setAuthPromptOpen(false)} className="flex h-11 flex-1 items-center justify-center gap-2 bg-[#D4AF37] px-4 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#17150E] hover:bg-[#E5C75E]">Sign in or create account <ArrowRight size={14} /></Link><button type="button" onClick={() => setAuthPromptOpen(false)} className="h-11 border border-white/15 px-4 text-[9px] uppercase tracking-[0.12em] text-white/65 hover:border-white/35">Not now</button></div>
          </section>
        </div>
      )}
    </AuthContext.Provider>
  )
}
