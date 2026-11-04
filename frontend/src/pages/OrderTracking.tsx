import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, Box, Check, CircleHelp, PackageCheck, PackageOpen, Truck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiRequest, customerHeaders } from '../lib/api'

type TrackedOrder = { id: string; itemCount: number; status: string; createdAt: string; city: string }
const steps = [
  { title: 'Order Placed', description: 'Your order is confirmed.', icon: Check },
  { title: 'Processing', description: 'Your pieces are being prepared.', icon: PackageOpen },
  { title: 'Dispatched', description: 'Your order is on its way.', icon: Truck },
  { title: 'Out for Delivery', description: 'Your delivery is close.', icon: PackageCheck },
]

export default function OrderTracking() {
  const [searchParams] = useSearchParams()
  const [orderId, setOrderId] = useState(() => searchParams.get('order') || '')
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const trackedOrderId = order?.id

  useEffect(() => {
    if (!trackedOrderId) return
    let active = true
    const refresh = () => apiRequest<{ order: TrackedOrder }>(`/orders/${encodeURIComponent(trackedOrderId)}`, { headers: customerHeaders() })
      .then(({ order: latestOrder }) => { if (active) { setOrder(latestOrder); setError('') } })
      .catch((requestError: Error) => { if (active) setError(requestError.message) })
    const timer = window.setInterval(refresh, 3000)
    return () => { active = false; window.clearInterval(timer) }
  }, [trackedOrderId])

  const track = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setOrder(null)
    try {
      const response = await apiRequest<{ order: TrackedOrder }>(`/orders/${encodeURIComponent(orderId.trim())}`, { headers: customerHeaders() })
      setOrder(response.order)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Order tracking is unavailable.')
    } finally {
      setLoading(false)
    }
  }

  const activeStep = order ? Math.max(0, steps.findIndex((step) => step.title === order.status)) : -1

  return (
    <div className="mx-auto max-w-[980px] px-4 py-9 text-[var(--ink)] sm:px-7 sm:py-14 lg:px-10">
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#A88417]">We’ll keep you posted</p>
      <h1 className="mt-2 font-serif text-[34px] sm:text-[42px]">Track your order</h1>
      <p className="mt-2 max-w-lg text-[12px] leading-5 text-[var(--muted)]">Enter your order reference to see its latest delivery update.</p>

      <form onSubmit={track} className="mt-7 flex max-w-xl gap-2">
        <label className="sr-only" htmlFor="tracking-reference">Order reference</label>
        <input id="tracking-reference" required value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="e.g. SC-12345678" className="h-12 min-w-0 flex-1 border border-[var(--line)] bg-[var(--surface)] px-4 text-[12px] text-[var(--ink)] outline-none focus:border-[#D4AF37]" />
        <button type="submit" disabled={loading} className="flex h-12 items-center gap-2 bg-[#17150E] px-5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white hover:bg-[#A88417] disabled:opacity-60">{loading ? 'Checking…' : 'Track'} <ArrowRight size={14} /></button>
      </form>
      {error && <p role="alert" className="mt-4 max-w-xl border-l-2 border-red-500 bg-red-50 px-3 py-2 text-[11px] text-red-700">{error}</p>}

      {order && (
        <section className="mt-9 border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-8" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-5"><div><p className="text-[9px] uppercase tracking-[0.16em] text-[#A88417]">Order reference</p><h2 className="mt-1 font-serif text-[22px]">{order.id}</h2></div><div className="text-right"><p className="text-[9px] uppercase tracking-[0.15em] text-[var(--muted)]">Destination</p><p className="mt-1 text-[12px]">{order.city}</p></div></div>
          <div className="relative mt-8 grid grid-cols-4 gap-1" aria-live="polite">
            <div className="absolute left-[12%] right-[12%] top-[15px] h-px bg-[var(--line)]" />
            <div className="absolute left-[12%] top-[15px] h-px bg-[#D4AF37] transition-all duration-500" style={{ width: `${Math.max(0, activeStep) * 25.3}%` }} />
            {steps.map(({ title, description, icon: Icon }, index) => {
              const complete = index <= activeStep
              return <div key={title} className="relative flex flex-col items-center text-center"><span className={`z-10 flex size-[31px] items-center justify-center rounded-full border ${complete ? 'border-[#D4AF37] bg-[#D4AF37] text-[#17150E]' : 'border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]'}`}><Icon size={14} /></span><p className={`mt-3 text-[9px] font-semibold sm:text-[11px] ${complete ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>{title}</p><p className="mt-1 hidden max-w-[130px] text-[9px] leading-4 text-[var(--muted)] sm:block">{description}</p></div>
            })}
          </div>
          <p className="mt-8 flex items-center gap-2 border-t border-[var(--line)] pt-4 text-[10px] text-[var(--muted)]"><Box size={14} className="text-[#A88417]" /> {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} · Status: {order.status} · Placed {new Date(order.createdAt).toLocaleDateString()}</p>
        </section>
      )}
      <p className="mt-9 flex items-center gap-2 text-[10px] text-[var(--muted)]"><CircleHelp size={14} className="text-[#A88417]" /> Need help? <Link to="/#contact" className="underline underline-offset-2 hover:text-[#A88417]">Contact our team</Link></p>
    </div>
  )
}
