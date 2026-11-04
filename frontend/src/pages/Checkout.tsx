import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, CreditCard, LockKeyhole, MessageCircle, ShieldCheck, Truck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { type DeliveryDetails } from '../context/shopContext'
import { useAuth } from '../context/useAuth'
import { useShop } from '../context/useShop'
import { apiRequest, customerHeaders } from '../lib/api'

const SHIPPING_FEE = 2500
const TAX_RATE = 0.075
const merchantPhone = import.meta.env.VITE_MERCHANT_WHATSAPP_NUMBER?.replace(/\D/g, '') ?? ''
const formatPrice = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)

const initialDelivery: DeliveryDetails = { fullName: '', phone: '', city: '', address: '', notes: '' }

function getDefaultDelivery(profile: { id: string; fullName: string; phone?: string } | null): DeliveryDetails {
  let defaultAddress: { street: string; city: string; state: string } | undefined
  try {
    const savedAddresses = JSON.parse(localStorage.getItem(`sandiego-settings-addresses:${profile?.id || 'customer'}`) || '[]') as { street: string; city: string; state: string; isDefault: boolean }[]
    defaultAddress = savedAddresses.find((address) => address.isDefault)
  } catch {
    defaultAddress = undefined
  }
  return {
    ...initialDelivery,
    fullName: profile?.fullName || '',
    phone: profile?.phone || '',
    city: defaultAddress?.city || '',
    address: defaultAddress ? `${defaultAddress.street}, ${defaultAddress.state}` : '',
  }
}

export default function Checkout() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { cartItems, totalPrice, removeFromCart, placeOrder, clearCart, orders } = useShop()
  const [delivery, setDelivery] = useState(() => getDefaultDelivery(profile))
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [toast, setToast] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const shipping = cartItems.length ? SHIPPING_FEE : 0
  const tax = Math.round(totalPrice * TAX_RATE)
  const total = totalPrice + shipping + tax
  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0)

  const updateDelivery = (field: keyof DeliveryDetails, value: string) => setDelivery((current) => ({ ...current, [field]: value }))

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!cartItems.length || isSubmitting) return

    setIsSubmitting(true)
    try {
      const result = await apiRequest<{ order: Parameters<typeof placeOrder>[0] }>('/orders', {
        method: 'POST',
        headers: { ...customerHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cartItems, delivery, subtotal: totalPrice, shipping, tax, total, paymentMethod }),
      })
      placeOrder(result.order)
      clearCart()
      setToast(`Order ${result.order.id} placed successfully.`)
      window.setTimeout(() => setToast(''), 5500)
    } catch (requestError) {
      setToast(requestError instanceof Error ? requestError.message : 'Your order could not be placed. Please try again.')
      window.setTimeout(() => setToast(''), 5500)
    } finally {
      setIsSubmitting(false)
    }
  }

  const orderOnWhatsApp = () => {
    if (!merchantPhone) {
      setToast('WhatsApp checkout is not configured yet. Add VITE_MERCHANT_WHATSAPP_NUMBER to the frontend environment.')
      window.setTimeout(() => setToast(''), 6500)
      return
    }
    const lines = cartItems.map(({ product, quantity }) => `• ${product.name} x${quantity} — ${formatPrice(product.price * quantity)}`)
    const message = [
      'Hello Sandiego Collections, I would like to place this order:',
      '',
      ...lines,
      '',
      `Subtotal: ${formatPrice(totalPrice)}`,
      `Shipping: ${formatPrice(shipping)}`,
      `Taxes: ${formatPrice(tax)}`,
      `Total: ${formatPrice(total)}`,
      '',
      `Name: ${delivery.fullName || 'Please confirm'}`,
      `Phone: ${delivery.phone || 'Please confirm'}`,
      `City: ${delivery.city || 'Please confirm'}`,
      `Delivery address: ${delivery.address || 'Please confirm'}`,
      `Delivery notes: ${delivery.notes?.trim() || 'None'}`,
    ].join('\n')
    window.open(`https://wa.me/${merchantPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  if (!cartItems.length) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-20 text-center text-[var(--ink)] sm:py-28">
        <div className="mx-auto flex size-12 items-center justify-center border border-[#D4AF37]/60 text-[#A88417]"><CreditCard size={20} /></div>
        <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#A88417]">Secure checkout</p>
        <h1 className="mt-2 font-serif text-[31px]">Your bag is empty.</h1>
        <p className="mt-2 text-[12px] text-[var(--muted)]">Choose a few pieces before heading to checkout.</p>
        <Link to="/" className="mt-6 inline-flex h-11 items-center gap-2 bg-[#D4AF37] px-5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#17150E]">Return to the collection <ArrowRight size={14} /></Link>
        {orders.length > 0 && <div className="mx-auto mt-12 max-w-lg border-t border-[var(--line)] pt-6 text-left"><h2 className="font-serif text-[20px]">Recent orders</h2><div className="mt-3 space-y-2">{orders.slice(0, 3).map((order) => <div key={order.id} className="flex items-center justify-between border-b border-[var(--line)] py-2 text-[11px]"><span>{order.id}</span><span className="text-[var(--muted)]">{formatPrice(order.total)}</span></div>)}</div></div>}
        {toast && <div role="status" className="fixed bottom-5 left-1/2 z-[100] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-3 border border-[#D4AF37]/50 bg-[#17150E] px-5 py-3 text-[11px] text-white shadow-xl"><Check size={16} className="shrink-0 text-[#D4AF37]" />{toast}</div>}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 text-[var(--ink)] sm:px-7 sm:py-10 lg:px-10">
      <Link to="/" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] transition hover:text-[#A88417]"><ArrowLeft size={14} /> Continue shopping</Link>
      <div className="mt-5 border-b border-[var(--line)] pb-5"><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#A88417]">Almost yours</p><h1 className="mt-1.5 font-serif text-[32px] sm:text-[39px]">Checkout</h1><p className="mt-1 text-[11px] text-[var(--muted)]">{itemCount} {itemCount === 1 ? 'piece' : 'pieces'} in your bag</p></div>

      <div className="mt-7 grid items-start gap-7 lg:grid-cols-[1fr_370px] lg:gap-10">
        <form id="checkout-form" onSubmit={submitOrder} className="space-y-5">
          <section className="border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-7">
            <div className="mb-5 flex items-center gap-3"><span className="flex size-8 items-center justify-center border border-[#D4AF37]/50 text-[11px] text-[#A88417]">01</span><div><h2 className="font-serif text-[21px]">Delivery details</h2><p className="mt-0.5 text-[10px] text-[var(--muted)]">Where should we send your pieces?</p></div></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-[10px] font-medium">Full name<input required autoComplete="name" value={delivery.fullName} onChange={(event) => updateDelivery('fullName', event.target.value)} placeholder="Name for delivery" className="mt-2 h-11 w-full border border-[var(--line)] bg-[var(--page-bg)] px-3 text-[12px] outline-none focus:border-[#D4AF37]" /></label>
              <label className="text-[10px] font-medium">Phone number<input required type="tel" autoComplete="tel" value={delivery.phone} onChange={(event) => updateDelivery('phone', event.target.value)} placeholder="+234 800 000 0000" className="mt-2 h-11 w-full border border-[var(--line)] bg-[var(--page-bg)] px-3 text-[12px] outline-none focus:border-[#D4AF37]" /></label>
              <label className="text-[10px] font-medium sm:col-span-2">City<input required autoComplete="address-level2" value={delivery.city} onChange={(event) => updateDelivery('city', event.target.value)} placeholder="City or town" className="mt-2 h-11 w-full border border-[var(--line)] bg-[var(--page-bg)] px-3 text-[12px] outline-none focus:border-[#D4AF37]" /></label>
              <label className="text-[10px] font-medium sm:col-span-2">Shipping address<textarea required autoComplete="street-address" value={delivery.address} onChange={(event) => updateDelivery('address', event.target.value)} placeholder="Street, building, neighbourhood" rows={3} className="mt-2 w-full resize-y border border-[var(--line)] bg-[var(--page-bg)] px-3 py-3 text-[12px] outline-none focus:border-[#D4AF37]" /></label>
              <label className="text-[10px] font-medium sm:col-span-2">Delivery notes <span className="font-normal text-[var(--muted)]">(optional)</span><textarea value={delivery.notes} onChange={(event) => updateDelivery('notes', event.target.value)} placeholder="Landmarks or delivery instructions" rows={2} className="mt-2 w-full resize-y border border-[var(--line)] bg-[var(--page-bg)] px-3 py-3 text-[12px] outline-none focus:border-[#D4AF37]" /></label>
            </div>
          </section>

          <section className="border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-7">
            <div className="mb-5 flex items-center gap-3"><span className="flex size-8 items-center justify-center border border-[#D4AF37]/50 text-[11px] text-[#A88417]">02</span><div><h2 className="font-serif text-[21px]">Payment method</h2><p className="mt-0.5 text-[10px] text-[var(--muted)]">Choose how you would like to pay.</p></div></div>
            <div className="space-y-2">
              <label className={`flex cursor-pointer items-center gap-3 border p-4 transition ${paymentMethod === 'card' ? 'border-[#D4AF37] bg-[#D4AF37]/[0.06]' : 'border-[var(--line)]'}`}><input type="radio" name="payment" value="card" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} className="accent-[#A88417]" /><CreditCard size={17} className="text-[#A88417]" /><span className="flex-1 text-[11px] font-medium">Credit or debit card</span><LockKeyhole size={14} className="text-[var(--muted)]" /></label>
              {paymentMethod === 'card' && <div className="grid gap-3 border border-t-0 border-[var(--line)] p-4 sm:grid-cols-2"><label className="text-[10px] sm:col-span-2">Card number<input inputMode="numeric" autoComplete="cc-number" placeholder="••••  ••••  ••••  ••••" className="mt-2 h-10 w-full border border-[var(--line)] bg-[var(--page-bg)] px-3 text-[12px] outline-none focus:border-[#D4AF37]" /></label><label className="text-[10px]">Expiry<input autoComplete="cc-exp" placeholder="MM / YY" className="mt-2 h-10 w-full border border-[var(--line)] bg-[var(--page-bg)] px-3 text-[12px] outline-none focus:border-[#D4AF37]" /></label><label className="text-[10px]">Security code<input inputMode="numeric" autoComplete="cc-csc" placeholder="CVV" className="mt-2 h-10 w-full border border-[var(--line)] bg-[var(--page-bg)] px-3 text-[12px] outline-none focus:border-[#D4AF37]" /></label><p className="flex items-center gap-2 text-[9px] leading-4 text-[var(--muted)] sm:col-span-2"><ShieldCheck size={14} className="shrink-0 text-[#A88417]" /> Card details are a demo only. Connect a payment provider before accepting real payments.</p></div>}
              <label className={`flex cursor-pointer items-center gap-3 border p-4 transition ${paymentMethod === 'delivery' ? 'border-[#D4AF37] bg-[#D4AF37]/[0.06]' : 'border-[var(--line)]'}`}><input type="radio" name="payment" value="delivery" checked={paymentMethod === 'delivery'} onChange={() => setPaymentMethod('delivery')} className="accent-[#A88417]" /><Truck size={17} className="text-[#A88417]" /><span className="flex-1 text-[11px] font-medium">Pay on delivery</span></label>
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            <button type="submit" disabled={isSubmitting} className="flex h-12 items-center justify-center gap-2 bg-[#D4AF37] px-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#17150E] transition hover:bg-[#E5C75E] disabled:opacity-60"><Check size={15} /> Place order</button>
            <button type="button" onClick={orderOnWhatsApp} className="flex h-12 items-center justify-center gap-2 border border-emerald-800 bg-[#147A4A] px-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#10643C]"><MessageCircle size={16} /> Order via WhatsApp</button>
          </div>
          <p className="text-center text-[9px] leading-4 text-[var(--muted)]">WhatsApp checkout shares your cart and delivery details with our configured merchant number.</p>
        </form>

        <aside className="border border-[var(--line)] bg-[var(--surface)] p-5 lg:sticky lg:top-[96px]">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#A88417]">Your selection</p><h2 className="mt-1 font-serif text-[22px]">Order summary</h2>
          <div className="mt-5 max-h-[290px] space-y-4 overflow-y-auto border-b border-[var(--line)] pb-5">{cartItems.map(({ product, quantity }) => <div key={product.id} className="flex gap-3"><img src={product.image} alt="" className="size-[58px] shrink-0 object-cover" /><div className="min-w-0 flex-1"><p className="truncate font-serif text-[14px]">{product.name}</p><p className="mt-1 text-[10px] text-[var(--muted)]">Qty {quantity}</p><p className="mt-1 text-[11px]">{formatPrice(product.price * quantity)}</p></div><button type="button" onClick={() => removeFromCart(product.id)} className="self-start text-[9px] text-[var(--muted)] underline underline-offset-2 hover:text-[#A88417]">Remove</button></div>)}</div>
          <dl className="space-y-3 py-5 text-[11px]"><div className="flex justify-between"><dt className="text-[var(--muted)]">Items ({itemCount})</dt><dd>{formatPrice(totalPrice)}</dd></div><div className="flex justify-between"><dt className="text-[var(--muted)]">Delivery</dt><dd>{shipping ? formatPrice(shipping) : 'Free'}</dd></div><div className="flex justify-between"><dt className="text-[var(--muted)]">Estimated tax (7.5%)</dt><dd>{formatPrice(tax)}</dd></div></dl>
          <div className="flex justify-between border-t border-[var(--line)] pt-4 text-[13px] font-semibold"><span>Total</span><span>{formatPrice(total)}</span></div>
          <p className="mt-4 flex items-center gap-2 text-[9px] leading-4 text-[var(--muted)]"><LockKeyhole size={13} className="shrink-0 text-[#A88417]" /> Your order details are protected.</p>
        </aside>
      </div>
      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-[100] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-3 border border-[#D4AF37]/50 bg-[#17150E] px-5 py-3 text-[11px] text-white shadow-xl"><Check size={16} className="shrink-0 text-[#D4AF37]" />{toast}{toast.startsWith('Order ') && <button type="button" onClick={() => navigate('/')} className="ml-1 underline underline-offset-2">Shop more</button>}</div>}
    </div>
  )
}
