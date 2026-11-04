import { createContext } from 'react'

export type AuthRole = 'guest' | 'customer' | 'admin'
export type AuthProfile = { id: string; fullName: string; email: string; phone?: string; avatarUrl?: string }

export type AuthContextValue = {
  role: AuthRole
  profile: AuthProfile | null
  ready: boolean
  signInCustomer: (token: string, profile: AuthProfile) => void
  signInAdmin: (token: string, profile: AuthProfile) => void
  updateProfile: (updates: Partial<Pick<AuthProfile, 'fullName' | 'phone' | 'avatarUrl'>>) => void
  signOut: () => void
  requestUserAccess: () => boolean
  closeAuthPrompt: () => void
  authPromptOpen: boolean
}

export const GUEST_RESTRICTION_MESSAGE = 'An account is required to curate your wishlist or complete a purchase at Sandiego Collections.'
export const AuthContext = createContext<AuthContextValue | null>(null)
