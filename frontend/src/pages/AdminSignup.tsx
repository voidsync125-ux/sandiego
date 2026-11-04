import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, LockKeyhole, ShieldCheck, UserRoundPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'

type AdminCountResponse = { count: number; limit: number; registrationOpen: boolean }
type SignupResponse = { token: string; admin: { fullName: string; email: string } }

export default function AdminSignup() {
  const navigate = useNavigate()
  const [adminCount, setAdminCount] = useState<AdminCountResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', password: '', inviteCode: '' })

  useEffect(() => {
    const controller = new AbortController()
    apiRequest<AdminCountResponse>('/auth/admin/count', { signal: controller.signal })
      .then(setAdminCount)
      .catch((requestError: Error) => {
        if (!controller.signal.aborted) setError(requestError.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const response = await apiRequest<SignupResponse>('/auth/admin/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      sessionStorage.setItem('sandiego-admin-token', response.token)
      navigate('/admin', { replace: true })
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Registration could not be completed.'
      setError(message)
      if (message === 'Registration Closed') {
        setAdminCount({ count: 3, limit: 3, registrationOpen: false })
      } else {
        apiRequest<AdminCountResponse>('/auth/admin/count').then(setAdminCount).catch(() => undefined)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const registrationClosed = adminCount && adminCount.count >= 3

  return (
    <div className="min-h-[calc(100vh-76px)] bg-[#0A0B09] px-4 py-12 text-white sm:px-8 sm:py-16">
      <div className="mx-auto max-w-[520px]">
        <Link to="/" className="text-[10px] uppercase tracking-[0.13em] text-white/50 transition hover:text-[#D4AF37]">← Back to storefront</Link>
        <div className="mt-9 border border-[#D4AF37]/25 bg-white/[0.025] p-6 sm:p-9">
          <span className="flex size-11 items-center justify-center border border-[#D4AF37]/55 text-[#D4AF37]"><ShieldCheck size={20} /></span>
          <p className="mt-6 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#D4AF37]">Private access</p>
          <h1 className="mt-2 font-serif text-[32px] sm:text-[38px]">Administrator registration</h1>
          <p className="mt-2 text-[11px] leading-5 text-white/55">A maximum of three verified administrator accounts are available.</p>

          {loading ? <p role="status" className="mt-8 text-[12px] text-white/60">Checking registration availability…</p> : registrationClosed ? (
            <div className="mt-8 border-l-2 border-[#D4AF37] bg-[#D4AF37]/[0.06] p-5"><p className="font-serif text-[18px] leading-relaxed text-[#E4C45E]">Administrative registration window has closed for Sandiego Collections.</p></div>
          ) : error && !adminCount ? (
            <div className="mt-8 border border-red-500/30 bg-red-950/20 p-4"><p role="alert" className="text-[12px] text-red-200">{error}</p><button type="button" onClick={() => window.location.reload()} className="mt-3 text-[10px] uppercase tracking-[0.12em] text-[#D4AF37]">Retry</button></div>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-4">
              <label className="block text-[10px] text-white/70">Full name<input required autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="mt-2 h-11 w-full border border-white/15 bg-black/30 px-3 text-[12px] text-white outline-none focus:border-[#D4AF37]" /></label>
              <label className="block text-[10px] text-white/70">Work email<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 h-11 w-full border border-white/15 bg-black/30 px-3 text-[12px] text-white outline-none focus:border-[#D4AF37]" /></label>
              <label className="block text-[10px] text-white/70">Password <span className="text-white/35">(12 characters minimum)</span><input required minLength={12} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-2 h-11 w-full border border-white/15 bg-black/30 px-3 text-[12px] text-white outline-none focus:border-[#D4AF37]" /></label>
              <label className="block text-[10px] text-white/70">Private invitation code<input required autoComplete="off" value={form.inviteCode} onChange={(event) => setForm({ ...form, inviteCode: event.target.value })} className="mt-2 h-11 w-full border border-white/15 bg-black/30 px-3 text-[12px] text-white outline-none focus:border-[#D4AF37]" /></label>
              {error && <p role="alert" className="border-l-2 border-red-400 bg-red-950/20 px-3 py-2 text-[11px] text-red-200">{error}</p>}
              <button type="submit" disabled={submitting} className="flex h-12 w-full items-center justify-center gap-2 bg-[#D4AF37] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#17150E] transition hover:bg-[#E5C75E] disabled:opacity-50"><UserRoundPlus size={15} />{submitting ? 'Creating account…' : 'Create administrator account'}<ArrowRight size={14} /></button>
              <p className="flex items-center justify-center gap-2 text-center text-[9px] leading-4 text-white/40"><LockKeyhole size={12} /> Invitation required · {adminCount?.count ?? 0} of 3 accounts registered</p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
