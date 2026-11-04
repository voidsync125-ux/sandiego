import { useEffect, useState } from 'react'
import { ArrowRight, LogOut, PackageCheck, Settings as SettingsIcon, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { customerHeaders, apiRequest } from '../lib/api'
import type { ShopOrder } from '../context/shopContext'

const formatPrice = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)

export default function UserDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<ShopOrder[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest<{ orders: ShopOrder[] }>('/orders/mine', { headers: customerHeaders() })
      .then(({ orders: customerOrders }) => setOrders(customerOrders))
      .catch((requestError: Error) => setError(requestError.message))
  }, [])

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 text-[var(--ink)] sm:px-8 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-6"><div><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#A88417]">Your Sandiego account</p><h1 className="mt-2 font-serif text-[34px]">Welcome{profile?.fullName ? `, ${profile.fullName.split(' ')[0]}` : ' back'}.</h1><p className="mt-1 text-[11px] text-[var(--muted)]">Your saved pieces and order updates, all together.</p></div><button type="button" onClick={() => { signOut(); navigate('/') }} className="flex h-9 items-center gap-2 border border-[var(--line)] px-3 text-[9px] uppercase tracking-[0.12em] text-[var(--muted)] hover:border-[#D4AF37] hover:text-[var(--ink)]"><LogOut size={13} /> Sign out</button></header>
      <div className="mt-7 grid gap-5 md:grid-cols-[0.75fr_1.25fr]">
        <section className="border border-[var(--line)] bg-[var(--surface)] p-5"><span className="flex size-10 items-center justify-center border border-[#D4AF37]/45 text-[#A88417]"><UserRound size={17} /></span><h2 className="mt-5 font-serif text-[21px]">Account details</h2><p className="mt-2 text-[11px] text-[var(--muted)]">{profile?.email || 'Signed in customer'}</p><div className="mt-5 flex flex-col items-start gap-3"><Link to="/settings/profile" className="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#A88417]"><SettingsIcon size={13} /> Manage settings</Link><Link to="/wishlist" className="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#A88417]">View wishlist <ArrowRight size={13} /></Link></div></section>
        <section className="border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-[9px] uppercase tracking-[0.18em] text-[#A88417]">Order history</p><h2 className="mt-1 font-serif text-[22px]">Your orders</h2></div><PackageCheck size={19} className="text-[#A88417]" /></div>{error ? <p role="alert" className="mt-5 border-l-2 border-red-500 bg-red-50 px-3 py-2 text-[10px] text-red-700">{error}</p> : orders.length ? <div className="mt-5 divide-y divide-[var(--line)]">{orders.map((order) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[11px]"><span><span className="block font-medium">{order.id}</span><span className="mt-1 block text-[9px] text-[var(--muted)]">{order.items.reduce((sum, item) => sum + item.quantity, 0)} items · {new Date(order.createdAt).toLocaleDateString()}</span></span><span className="flex items-center gap-3"><span>{formatPrice(order.total)}</span><Link to={`/order-tracking?order=${encodeURIComponent(order.id)}`} className="text-[9px] uppercase tracking-[0.1em] text-[#A88417]">Track</Link></span></div>)}</div> : <div className="mt-5 border-t border-[var(--line)] py-8 text-center"><p className="font-serif text-[18px]">Your next favourite is out there.</p><p className="mt-2 text-[10px] text-[var(--muted)]">Your placed orders will appear here.</p><Link to="/store" className="mt-4 inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#A88417]">Explore the store <ArrowRight size={13} /></Link></div>}</section>
      </div>
    </div>
  )
}
