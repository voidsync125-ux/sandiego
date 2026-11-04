import { useState, type FormEvent } from 'react'
import { Check, Clock3, Mail, MapPin, MessageCircle, Send } from 'lucide-react'

const whatsappNumber = import.meta.env.VITE_MERCHANT_WHATSAPP_NUMBER?.replace(/\D/g, '')

export default function ContactUs() {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', topic: 'Order support', message: '' })
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    setForm({ name: '', email: '', topic: 'Order support', message: '' })
    window.setTimeout(() => setSubmitted(false), 6000)
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--ink)]">
      <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
        <header className="border-b border-[var(--line)] pb-6"><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#A88417]">We’re here for you</p><h1 className="mt-2 font-serif text-[35px] sm:text-[43px]">Let’s talk.</h1><p className="mt-2 max-w-lg text-[12px] leading-5 text-[var(--muted)]">Questions about a piece, an order, or choosing a ritual? Send us a note and our team will get back to you.</p></header>
        <div className="mt-7 grid items-start gap-7 lg:grid-cols-[1fr_340px] lg:gap-12">
          <form onSubmit={submit} className="border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-[10px] font-medium">Your name<input required autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 h-11 w-full border border-[var(--line)] bg-[var(--page-bg)] px-3 text-[12px] outline-none transition focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30" /></label>
              <label className="text-[10px] font-medium">Email address<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 h-11 w-full border border-[var(--line)] bg-[var(--page-bg)] px-3 text-[12px] outline-none transition focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30" /></label>
              <label className="text-[10px] font-medium sm:col-span-2">What can we help with?<select value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} className="mt-2 h-11 w-full border border-[var(--line)] bg-[var(--page-bg)] px-3 text-[12px] outline-none focus:border-[#D4AF37]"><option>Order support</option><option>Product question</option><option>Returns and exchanges</option><option>Wholesale and partnerships</option><option>Other enquiry</option></select></label>
              <label className="text-[10px] font-medium sm:col-span-2">Your message<textarea required minLength={10} maxLength={2000} rows={6} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Tell us a little about what you need…" className="mt-2 w-full resize-y border border-[var(--line)] bg-[var(--page-bg)] px-3 py-3 text-[12px] leading-5 outline-none transition focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30" /></label>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4"><p className="text-[9px] text-[var(--muted)]">Your details are only used to reply to your enquiry.</p><button type="submit" className="flex h-11 items-center justify-center gap-2 bg-[#D4AF37] px-5 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#17150E] transition hover:bg-[#E5C75E]"><Send size={14} /> Send message</button></div>
            {submitted && <p role="status" className="mt-5 flex items-center gap-2 border-l-2 border-emerald-600 bg-emerald-50 px-4 py-3 text-[11px] text-emerald-800"><Check size={15} /> Thanks for reaching out. Your message is ready for our team.</p>}
          </form>
          <aside className="space-y-5 border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
            <div><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#A88417]">Customer care</p><h2 className="mt-1 font-serif text-[22px]">A real person, soon.</h2></div>
            <a href="mailto:hello@sandiegocollections.com" className="flex items-start gap-3 text-[11px] text-[var(--muted)] hover:text-[#A88417]"><Mail size={16} className="mt-0.5 shrink-0 text-[#A88417]" /><span><span className="block text-[var(--ink)]">Email</span>hello@sandiegocollections.com</span></a>
            {whatsappNumber && <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="flex items-start gap-3 text-[11px] text-[var(--muted)] hover:text-[#A88417]"><MessageCircle size={16} className="mt-0.5 shrink-0 text-[#A88417]" /><span><span className="block text-[var(--ink)]">WhatsApp</span>Message customer care</span></a>}
            <div className="border-t border-[var(--line)] pt-4"><p className="flex items-center gap-2 text-[10px] font-medium"><Clock3 size={15} className="text-[#A88417]" /> Customer care hours</p><p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">Monday – Friday · 9:00 am – 5:00 pm<br />Saturday · 10:00 am – 2:00 pm<br />West Africa Time</p></div>
            <p className="flex items-start gap-2 border-t border-[var(--line)] pt-4 text-[10px] leading-5 text-[var(--muted)]"><MapPin size={15} className="mt-0.5 shrink-0 text-[#A88417]" />Lagos, Nigeria · Worldwide delivery</p>
          </aside>
        </div>
      </div>
    </div>
  )
}
