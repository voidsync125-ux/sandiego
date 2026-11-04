import { useState, type FormEvent } from 'react'
import { ArrowLeft, Check, ImagePlus, KeyRound, MapPin, Moon, Sun, UserRound, Bell, Trash2 } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { customerHeaders, apiRequest } from '../lib/api'

type SettingsProps = { isLight: boolean; onSetDarkMode: (dark: boolean) => void }
type Address = { id: string; street: string; city: string; state: string; isDefault: boolean }
type Preferences = { promoEmail: boolean; smsUpdates: boolean; darkMode: boolean }

const tabs = [
  { path: 'profile', label: 'Profile', icon: UserRound },
  { path: 'addresses', label: 'Addresses', icon: MapPin },
  { path: 'security', label: 'Security', icon: KeyRound },
  { path: 'preferences', label: 'Preferences', icon: Bell },
]

function loadJson<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key)
    return data ? { ...fallback as object, ...JSON.parse(data) as object } as T : fallback
  } catch {
    return fallback
  }
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] py-4 last:border-0"><div><p className="text-[11px] font-medium">{label}</p><p className="mt-1 max-w-md text-[10px] leading-4 text-[var(--muted)]">{description}</p></div><button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-[22px] w-10 shrink-0 border transition-colors ${checked ? 'border-[#A88417] bg-[#D4AF37]' : 'border-[var(--line)] bg-[var(--page-bg)]'}`}><span className={`absolute top-[3px] size-3.5 transition-all ${checked ? 'left-[21px] bg-[#17150E]' : 'left-[3px] bg-[var(--muted)]'}`} /></button></div>
}

export default function Settings({ isLight, onSetDarkMode }: SettingsProps) {
  const location = useLocation()
  const { profile, updateProfile } = useAuth()
  const activeTab = location.pathname.split('/').filter(Boolean).at(-1) || 'profile'
  const profileKey = `sandiego-settings-profile:${profile?.id || 'customer'}`
  const addressKey = `sandiego-settings-addresses:${profile?.id || 'customer'}`
  const preferenceKey = `sandiego-settings-preferences:${profile?.id || 'customer'}`
  const [profileForm, setProfileForm] = useState(() => loadJson(profileKey, { fullName: profile?.fullName || '', phone: profile?.phone || '', avatarUrl: profile?.avatarUrl || '' }))
  const [addresses, setAddresses] = useState<Address[]>(() => {
    try { return JSON.parse(localStorage.getItem(addressKey) || '[]') as Address[] } catch { return [] }
  })
  const [preferences, setPreferences] = useState<Preferences>(() => loadJson(preferenceKey, { promoEmail: false, smsUpdates: true, darkMode: !isLight }))
  const [newAddressOpen, setNewAddressOpen] = useState(false)
  const [addressForm, setAddressForm] = useState({ street: '', city: '', state: '' })
  const [securityForm, setSecurityForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 4500)
  }

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    localStorage.setItem(profileKey, JSON.stringify(profileForm))
    updateProfile(profileForm)
    showToast('Your profile has been updated.')
  }

  const persistAddresses = (nextAddresses: Address[]) => {
    setAddresses(nextAddresses)
    localStorage.setItem(addressKey, JSON.stringify(nextAddresses))
  }

  const addAddress = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const address: Address = { id: crypto.randomUUID(), ...addressForm, isDefault: addresses.length === 0 }
    persistAddresses([...addresses, address])
    setAddressForm({ street: '', city: '', state: '' })
    setNewAddressOpen(false)
    showToast('Delivery address saved.')
  }

  const setDefaultAddress = (addressId: string) => {
    persistAddresses(addresses.map((address) => ({ ...address, isDefault: address.id === addressId })))
    showToast('Default delivery destination updated.')
  }

  const deleteAddress = (addressId: string) => {
    const remaining = addresses.filter((address) => address.id !== addressId)
    if (addresses.find((address) => address.id === addressId)?.isDefault && remaining[0]) {
      remaining[0] = { ...remaining[0], isDefault: true }
    }
    persistAddresses(remaining)
  }

  const updatePreference = (key: keyof Preferences, value: boolean) => {
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    localStorage.setItem(preferenceKey, JSON.stringify(next))
    if (key === 'darkMode') onSetDarkMode(value)
  }

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (securityForm.newPassword.length < 10) {
      setError('Your new password must contain at least 10 characters.')
      return
    }
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      setError('The new password and confirmation do not match.')
      return
    }
    try {
      await apiRequest('/auth/password', {
        method: 'PATCH',
        headers: { ...customerHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: securityForm.currentPassword, newPassword: securityForm.newPassword }),
      })
      setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      showToast('Your password has been updated.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Password could not be updated.')
    }
  }

  const tabTitles: Record<string, { title: string; intro: string }> = {
    profile: { title: 'Profile details', intro: 'Keep your personal details current for a more considered experience.' },
    addresses: { title: 'Shipping addresses', intro: 'Save delivery destinations and choose your default address.' },
    security: { title: 'Security', intro: 'Use a unique password to help keep your account protected.' },
    preferences: { title: 'Preferences', intro: 'Choose what you hear from us and how the store looks.' },
  }
  const view = tabTitles[activeTab] || tabTitles.profile

  return (
    <div className="mx-auto max-w-[1220px] px-4 py-7 text-[var(--ink)] sm:px-7 sm:py-10 lg:px-10">
      <Link to="/account/dashboard" className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.13em] text-[var(--muted)] hover:text-[#A88417]"><ArrowLeft size={13} /> Your account</Link>
      <header className="mt-5 border-b border-[var(--line)] pb-5"><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#A88417]">Account settings</p><h1 className="mt-2 font-serif text-[32px] sm:text-[38px]">Settings</h1></header>
      <div className="mt-6 grid items-start gap-6 md:grid-cols-[210px_1fr] lg:gap-10">
        <nav aria-label="Settings sections" className="grid grid-cols-2 gap-1 border-b border-[var(--line)] pb-3 md:block md:border-0 md:pb-0">{tabs.map(({ path, label, icon: Icon }) => <Link key={path} to={`/settings/${path}`} aria-current={activeTab === path ? 'page' : undefined} className={`flex items-center gap-2.5 px-3 py-3 text-[10px] transition ${activeTab === path ? 'border-l-2 border-[#D4AF37] bg-[var(--surface)] text-[var(--ink)]' : 'text-[var(--muted)] hover:text-[#A88417]'}`}><Icon size={15} className={activeTab === path ? 'text-[#A88417]' : ''} />{label}</Link>)}</nav>
        <section className="min-h-[390px] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-7">
          <div className="border-b border-[var(--line)] pb-4"><h2 className="font-serif text-[23px]">{view.title}</h2><p className="mt-1 text-[10px] text-[var(--muted)]">{view.intro}</p></div>

          {activeTab === 'profile' && <form onSubmit={saveProfile} className="mt-6 max-w-2xl space-y-5"><div className="flex items-center gap-4"><span className="flex size-[68px] items-center justify-center overflow-hidden rounded-full border border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#A88417]">{profileForm.avatarUrl ? <img src={profileForm.avatarUrl} alt="Profile preview" className="size-full object-cover" /> : <ImagePlus size={21} />}</span><div><label className="block text-[10px] font-medium">Profile picture URL<input type="url" value={profileForm.avatarUrl} onChange={(event) => setProfileForm({ ...profileForm, avatarUrl: event.target.value })} placeholder="https://example.com/photo.jpg" className="mt-2 h-10 w-full min-w-[220px] border border-[var(--line)] bg-[var(--page-bg)] px-3 text-[11px] outline-none focus:border-[#D4AF37]" /></label><p className="mt-1 text-[9px] text-[var(--muted)]">Paste an image URL to preview your profile picture.</p></div></div><label className="block text-[10px] font-medium">Full name<input required value={profileForm.fullName} onChange={(event) => setProfileForm({ ...profileForm, fullName: event.target.value })} className="mt-2 h-11 w-full border border-[var(--line)] bg-[var(--page-bg)] px-3 text-[12px] outline-none focus:border-[#D4AF37]" /></label><label className="block text-[10px] font-medium">Phone number<input type="tel" autoComplete="tel" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} className="mt-2 h-11 w-full border border-[var(--line)] bg-[var(--page-bg)] px-3 text-[12px] outline-none focus:border-[#D4AF37]" /></label><button type="submit" className="h-10 bg-[#D4AF37] px-5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#17150E] hover:bg-[#E5C75E]">Save profile</button></form>}

          {activeTab === 'addresses' && <div className="mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] text-[var(--muted)]">{addresses.length} saved {addresses.length === 1 ? 'address' : 'addresses'}</p><button type="button" onClick={() => setNewAddressOpen((open) => !open)} className="h-9 border border-[#D4AF37] px-4 text-[9px] font-semibold uppercase tracking-[0.1em] hover:bg-[#D4AF37] hover:text-[#17150E]">{newAddressOpen ? 'Cancel' : 'Add new address'}</button></div>{newAddressOpen && <form onSubmit={addAddress} className="mt-4 grid gap-3 border border-[var(--line)] bg-[var(--page-bg)] p-4 sm:grid-cols-3"><label className="text-[9px] font-medium sm:col-span-3">Street address<input required value={addressForm.street} onChange={(event) => setAddressForm({ ...addressForm, street: event.target.value })} className="mt-2 h-10 w-full border border-[var(--line)] bg-[var(--surface)] px-3 text-[11px] outline-none focus:border-[#D4AF37]" /></label><label className="text-[9px] font-medium">City<input required value={addressForm.city} onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })} className="mt-2 h-10 w-full border border-[var(--line)] bg-[var(--surface)] px-3 text-[11px] outline-none focus:border-[#D4AF37]" /></label><label className="text-[9px] font-medium">State<input required value={addressForm.state} onChange={(event) => setAddressForm({ ...addressForm, state: event.target.value })} className="mt-2 h-10 w-full border border-[var(--line)] bg-[var(--surface)] px-3 text-[11px] outline-none focus:border-[#D4AF37]" /></label><div className="flex items-end"><button type="submit" className="h-10 w-full bg-[#D4AF37] text-[9px] font-semibold uppercase tracking-[0.1em] text-[#17150E]">Save address</button></div></form>}{addresses.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{addresses.map((address) => <article key={address.id} className={`border p-4 ${address.isDefault ? 'border-[#D4AF37]/70 bg-[#D4AF37]/[0.04]' : 'border-[var(--line)]'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-medium">{address.street}</p><p className="mt-1 text-[10px] text-[var(--muted)]">{address.city}, {address.state}</p></div><button type="button" aria-label="Remove address" onClick={() => deleteAddress(address.id)} className="text-[var(--muted)] hover:text-red-600"><Trash2 size={14} /></button></div><button type="button" role="radio" aria-checked={address.isDefault} onClick={() => setDefaultAddress(address.id)} className="mt-4 flex items-center gap-2 text-[9px] uppercase tracking-[0.1em] text-[#A88417]"><span className={`flex size-4 items-center justify-center rounded-full border ${address.isDefault ? 'border-[#A88417]' : 'border-[var(--line)]'}`}>{address.isDefault && <span className="size-2 rounded-full bg-[#A88417]" />}</span>{address.isDefault ? 'Default delivery destination' : 'Set as default'}</button></article>)}</div> : !newAddressOpen && <p className="mt-10 text-center text-[11px] text-[var(--muted)]">No saved addresses yet. Add a delivery destination above.</p>}</div>}

          {activeTab === 'security' && <form onSubmit={updatePassword} className="mt-6 max-w-lg space-y-4"><label className="block text-[10px] font-medium">Current password<input required type="password" autoComplete="current-password" value={securityForm.currentPassword} onChange={(event) => setSecurityForm({ ...securityForm, currentPassword: event.target.value })} className="mt-2 h-11 w-full border border-[var(--line)] bg-[var(--page-bg)] px-3 text-[12px] outline-none focus:border-[#D4AF37]" /></label><label className="block text-[10px] font-medium">New password<input required minLength={10} type="password" autoComplete="new-password" value={securityForm.newPassword} onChange={(event) => setSecurityForm({ ...securityForm, newPassword: event.target.value })} className="mt-2 h-11 w-full border border-[var(--line)] bg-[var(--page-bg)] px-3 text-[12px] outline-none focus:border-[#D4AF37]" /><span className="mt-1 block text-[9px] text-[var(--muted)]">Use at least 10 characters.</span></label><label className="block text-[10px] font-medium">Confirm new password<input required minLength={10} type="password" autoComplete="new-password" value={securityForm.confirmPassword} onChange={(event) => setSecurityForm({ ...securityForm, confirmPassword: event.target.value })} className="mt-2 h-11 w-full border border-[var(--line)] bg-[var(--page-bg)] px-3 text-[12px] outline-none focus:border-[#D4AF37]" /></label>{error && <p role="alert" className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-[10px] text-red-700">{error}</p>}<button type="submit" className="h-10 bg-[#D4AF37] px-5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#17150E] hover:bg-[#E5C75E]">Update password</button></form>}

          {activeTab === 'preferences' && <div className="mt-3"><Toggle label="Promotional email alerts" description="Occasional notes about new arrivals, collection edits, and private offers." checked={preferences.promoEmail} onChange={(value) => updatePreference('promoEmail', value)} /><Toggle label="SMS order updates" description="Receive essential delivery milestones by text message." checked={preferences.smsUpdates} onChange={(value) => updatePreference('smsUpdates', value)} /><Toggle label="Dark appearance" description="Switch the storefront and navigation to the midnight color theme." checked={preferences.darkMode} onChange={(value) => updatePreference('darkMode', value)} /><div className="mt-5 flex items-center gap-2 text-[9px] text-[var(--muted)]">{isLight ? <Sun size={14} /> : <Moon size={14} />} Appearance is applied throughout the store.</div></div>}
        </section>
      </div>
      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-[100] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2 border border-[#D4AF37]/50 bg-[#17150E] px-4 py-3 text-[10px] text-white shadow-xl"><Check size={14} className="text-[#D4AF37]" />{toast}</div>}
    </div>
  )
}
