import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import { useAuth } from '../context/useAuth'
import { INVALID_EMAIL_MESSAGE, isValidEmail } from '../lib/validation'

type AuthResponse = { token: string; user: { id: string; fullName: string; email: string } }

export default function AccountPortal() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signInCustomer } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!isValidEmail(form.email.trim())) {
      setError(INVALID_EMAIL_MESSAGE)
      return
    }
    setSubmitting(true)
    try {
      const response = await apiRequest<AuthResponse>(mode === 'signup' ? '/auth/signup' : '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'signup' ? form : { email: form.email, password: form.password }),
      })
      signInCustomer(response.token, response.user)
      const destination = (location.state as { from?: string; message?: string } | null)?.from || '/store'
      navigate(destination, { replace: true })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'We could not complete your request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-[#090A08] text-white lg:grid-cols-[0.85fr_1.15fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_70%_30%,rgba(212,175,55,0.16),transparent_40%),linear-gradient(145deg,#191810,#090A08_72%)] lg:block"><div className="absolute -right-24 top-1/4 size-[520px] rounded-full border border-[#D4AF37]/15" /><div className="absolute -right-8 top-[calc(25%+64px)] size-[390px] rounded-full border border-[#D4AF37]/10" /><div className="absolute bottom-12 left-12 max-w-md"><p className="text-[9px] uppercase tracking-[0.22em] text-[#E5C75E]">Sandiego Collections</p><p className="mt-3 font-serif text-[34px] leading-tight">We care about your well being.</p></div></section>
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-9 lg:px-16">
        <header className="flex items-center justify-between"><Link to="/" className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.13em] text-white/50 hover:text-[#E5C75E]"><ArrowLeft size={13} /> Back</Link><Link to="/store" className="text-[9px] uppercase tracking-[0.12em] text-white/45 hover:text-[#E5C75E]">Browse as guest</Link></header>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-10">
          <span className="flex size-11 items-center justify-center border border-[#D4AF37]/60 text-[#D4AF37]"><UserRound size={19} /></span>
          <p className="mt-7 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">Your Sandiego account</p>
          <h1 className="mt-2 font-serif text-[34px]">{mode === 'signin' ? 'Welcome back.' : 'Come on in.'}</h1>
          <p className="mt-2 text-[11px] leading-5 text-white/50">{(location.state as { message?: string } | null)?.message || (mode === 'signin' ? 'Sign in to pick up where you left off.' : 'Create an account and keep the pieces you love close.')}</p>
          <div className="mt-7 grid grid-cols-2 border-b border-white/15"><button type="button" onClick={() => { setMode('signin'); setError('') }} className={`pb-3 text-[9px] uppercase tracking-[0.14em] ${mode === 'signin' ? 'border-b border-[#D4AF37] text-[#E5C75E]' : 'text-white/40'}`}>Sign in</button><button type="button" onClick={() => { setMode('signup'); setError('') }} className={`pb-3 text-[9px] uppercase tracking-[0.14em] ${mode === 'signup' ? 'border-b border-[#D4AF37] text-[#E5C75E]' : 'text-white/40'}`}>Create account</button></div>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'signup' && <label className="block text-[10px] text-white/65">Full name<input required autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="mt-2 h-11 w-full border border-white/15 bg-white/[0.035] px-3 text-[12px] text-white outline-none focus:border-[#D4AF37]" /></label>}
            <label className="block text-[10px] text-white/65">Email address<span className="relative mt-2 block"><Mail size={15} className="absolute left-3 top-3 text-white/35" /><input type="text" inputMode="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="h-11 w-full border border-white/15 bg-white/[0.035] pl-10 pr-3 text-[12px] text-white outline-none focus:border-[#D4AF37]" /></span></label>
            <label className="block text-[10px] text-white/65">Password<span className="relative mt-2 block"><LockKeyhole size={15} className="absolute left-3 top-3 text-white/35" /><input required minLength={mode === 'signup' ? 10 : 1} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="h-11 w-full border border-white/15 bg-white/[0.035] pl-10 pr-3 text-[12px] text-white outline-none focus:border-[#D4AF37]" /></span></label>
            {error && <p role="alert" className="border-l-2 border-[#D4AF37] bg-[#D4AF37]/10 px-3 py-2 text-[11px] text-[#E5C75E]">{error}</p>}
            <button type="submit" disabled={submitting} className="flex h-12 w-full items-center justify-center gap-2 bg-[#D4AF37] text-[9px] font-semibold uppercase tracking-[0.14em] text-[#17150E] transition hover:bg-[#E5C75E] disabled:opacity-60">{submitting ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={14} /></button>
          </form>
        </div>
        <p className="pb-3 text-center text-[9px] text-white/35">By continuing, you agree to our store terms and privacy policy.</p>
      </section>
    </main>
  )
}
