import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, KeyRound, ShieldCheck } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { apiRequest } from '../lib/api'
import { INVALID_EMAIL_MESSAGE, isValidEmail } from '../lib/validation'

type AdminCount = { count: number; limit: number; registrationOpen: boolean }
type AdminResponse = { token: string; admin: { id: string; fullName: string; email: string } }
type Mode = 'signin' | 'signup'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { signInAdmin } = useAuth()
  const [adminCount, setAdminCount] = useState<AdminCount | null>(null)
  const [loadingCount, setLoadingCount] = useState(true)
  const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'signup' ? 'signup' : 'signin')
  const [form, setForm] = useState({ fullName: '', email: '', password: '', inviteCode: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    apiRequest<AdminCount>('/auth/admin/count', { signal: controller.signal })
      .then((count) => {
        setAdminCount(count)
        if (count.count >= 3) setMode('signin')
      })
      .catch((requestError: Error) => { if (!controller.signal.aborted) setError(requestError.message) })
      .finally(() => { if (!controller.signal.aborted) setLoadingCount(false) })
    return () => controller.abort()
  }, [])

  const registrationClosed = (adminCount?.count ?? 0) >= 3
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!isValidEmail(form.email.trim())) {
      setError(INVALID_EMAIL_MESSAGE)
      return
    }
    setSubmitting(true)
    try {
      const endpoint = mode === 'signup' ? '/auth/admin/signup' : '/auth/admin/login'
      const result = await apiRequest<AdminResponse>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'signup' ? form : { email: form.email, password: form.password }),
      })
      signInAdmin(result.token, result.admin)
      navigate('/admin', { replace: true })
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Sign-in could not be completed.'
      setError(message)
      if (message === 'Registration Closed') {
        setAdminCount({ count: 3, limit: 3, registrationOpen: false })
        setMode('signin')
      } else if (mode === 'signup') {
        apiRequest<AdminCount>('/auth/admin/count').then(setAdminCount).catch(() => undefined)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const selectMode = (nextMode: Mode) => {
    setMode(nextMode)
    setError('')
  }

  return (
    <main className="grid min-h-screen bg-[#090A08] text-white lg:grid-cols-[1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[radial-gradient(ellipse_at_70%_30%,rgba(212,175,55,0.14),transparent_42%),linear-gradient(145deg,#191810,#090A08_72%)] lg:block"><div className="absolute -right-24 top-1/4 size-[520px] rounded-full border border-[#D4AF37]/15" /><div className="absolute -right-8 top-[calc(25%+64px)] size-[390px] rounded-full border border-[#D4AF37]/10" /><p className="absolute bottom-12 left-12 max-w-sm font-serif text-[31px] leading-tight">Thoughtful details. Carefully kept.</p></section>
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-9 lg:px-16"><Link to="/" className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.13em] text-white/50 hover:text-[#E5C75E]"><ArrowLeft size={13} /> Back to Sandiego</Link><div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12"><span className="flex size-11 items-center justify-center border border-[#D4AF37]/55 text-[#D4AF37]"><ShieldCheck size={20} /></span><p className="mt-7 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">Staff portal</p><h1 className="mt-2 font-serif text-[34px]">{mode === 'signin' ? 'Administrator sign in' : 'Administrator registration'}</h1><p className="mt-2 text-[11px] text-white/50">Reserved for Sandiego Collections staff.</p>
        {!loadingCount && !registrationClosed && <div className="mt-6 grid grid-cols-2 border-b border-white/15"><button type="button" onClick={() => selectMode('signin')} className={`pb-3 text-[9px] uppercase tracking-[0.14em] ${mode === 'signin' ? 'border-b border-[#D4AF37] text-[#E5C75E]' : 'text-white/40'}`}>Sign in</button><button type="button" onClick={() => selectMode('signup')} className={`pb-3 text-[9px] uppercase tracking-[0.14em] ${mode === 'signup' ? 'border-b border-[#D4AF37] text-[#E5C75E]' : 'text-white/40'}`}>Register</button></div>}
        {loadingCount ? <p role="status" className="mt-7 text-[11px] text-white/50">Checking administrator access…</p> : (
          <>
            {registrationClosed && <p className="mt-6 border-l-2 border-[#D4AF37] bg-[#D4AF37]/[0.06] px-4 py-3 font-serif text-[15px] leading-6 text-[#E5C75E]">Administrative registration window has closed for Sandiego Collections.</p>}
            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === 'signup' && !registrationClosed && <label className="block text-[10px] text-white/65">Full name<input required autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="mt-2 h-11 w-full border border-white/15 bg-white/[0.035] px-3 text-[12px] text-white outline-none focus:border-[#D4AF37]" /></label>}
              <label className="block text-[10px] text-white/65">Work email<input type="text" inputMode="email" autoComplete="username" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 h-11 w-full border border-white/15 bg-white/[0.035] px-3 text-[12px] text-white outline-none focus:border-[#D4AF37]" /></label>
              <label className="block text-[10px] text-white/65">Password{mode === 'signup' && !registrationClosed && <span className="ml-1 text-white/35">(12 characters minimum)</span>}<input required minLength={mode === 'signup' && !registrationClosed ? 12 : 1} type="password" autoComplete={mode === 'signup' && !registrationClosed ? 'new-password' : 'current-password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-2 h-11 w-full border border-white/15 bg-white/[0.035] px-3 text-[12px] text-white outline-none focus:border-[#D4AF37]" /></label>
              {mode === 'signup' && !registrationClosed && <label className="block text-[10px] text-white/65">Private invitation code<input required autoComplete="off" value={form.inviteCode} onChange={(event) => setForm({ ...form, inviteCode: event.target.value })} className="mt-2 h-11 w-full border border-white/15 bg-white/[0.035] px-3 text-[12px] text-white outline-none focus:border-[#D4AF37]" /></label>}
              {error && <p role="alert" className="border-l-2 border-[#D4AF37] bg-[#D4AF37]/10 px-3 py-2 text-[11px] text-[#E5C75E]">{error}</p>}
              <button type="submit" disabled={submitting} className="flex h-12 w-full items-center justify-center gap-2 bg-[#D4AF37] text-[9px] font-semibold uppercase tracking-[0.14em] text-[#17150E] hover:bg-[#E5C75E] disabled:opacity-60"><KeyRound size={14} />{submitting ? 'Verifying…' : mode === 'signup' && !registrationClosed ? 'Create administrator account' : 'Sign in'}<ArrowRight size={14} /></button>
            </form>
            {!registrationClosed && <p className="mt-5 flex items-center justify-center gap-2 text-center text-[9px] text-white/40">Invitation required · {adminCount?.count ?? 0} of 3 administrator accounts registered</p>}
          </>
        )}
      </div></section>
    </main>
  )
}
