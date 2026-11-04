import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { GUEST_RESTRICTION_MESSAGE, type AuthRole } from '../context/authContext'
import { useAuth } from '../context/useAuth'

export default function RequireAuth({ role, children }: { role: Exclude<AuthRole, 'guest'>; children: ReactNode }) {
  const { role: currentRole, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <div role="status" className="min-h-[calc(100vh-76px)] px-5 py-24 text-center text-[11px] text-[var(--muted)]">Verifying your account…</div>
  if (currentRole === role) return children

  const message = role === 'customer' ? GUEST_RESTRICTION_MESSAGE : 'Administrator sign-in is required to continue.'
  const destination = role === 'admin' ? '/admin/login' : '/account'
  return <Navigate to={destination} replace state={{ message, from: location.pathname }} />
}
