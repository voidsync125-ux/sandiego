import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Heart, Minus, Plus, ShieldCheck, Star, Truck } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useShop } from '../context/useShop'
import { useAuth } from '../context/useAuth'
import { apiRequest } from '../lib/api'
import type { Product } from '../data/products'

const formatPrice = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)

function RatingStars({ rating }: { rating: number }) {
  return <span className="inline-flex items-center gap-1 text-[#B89124]" aria-label={`${rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={14} fill={index < Math.round(rating) ? 'currentColor' : 'none'} strokeWidth={1.6} />)}</span>
}

export default function ProductDetails() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { addToCart, toggleWishlist, wishlistItems } = useShop()
  const { requestUserAccess } = useAuth()
  const imageTrack = useRef<HTMLDivElement>(null)
  const [backendProduct, setBackendProduct] = useState<Product | null>(null)
  const [requestState, setRequestState] = useState({ productId: '', error: '' })
  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [variant, setVariant] = useState('')
  useEffect(() => {
    let mounted = true
    const refresh = () => apiRequest<{ products: Product[] }>('/products')
      .then(({ products }) => {
        if (mounted) {
          setBackendProduct(products.find((item) => item.id === productId) ?? null)
          setRequestState({ productId: productId || '', error: '' })
        }
      })
      .catch((error: Error) => { if (mounted) setRequestState({ productId: productId || '', error: error.message }) })
    refresh()
    const interval = window.setInterval(refresh, 5000)
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('sandiego-products') : null
    channel?.addEventListener('message', refresh)
    return () => {
      mounted = false
      window.clearInterval(interval)
      channel?.removeEventListener('message', refresh)
      channel?.close()
    }
  }, [productId])

  const currentRequest = requestState.productId === (productId || '')
  const loadError = currentRequest ? requestState.error : ''
  const loadingProduct = !currentRequest
  const product = currentRequest ? backendProduct : null
  const isWishlisted = product ? wishlistItems.some((item) => item.id === product.id) : false

  if (!product) {
    return <section className="mx-auto max-w-3xl px-6 py-24 text-center text-[var(--ink)]"><p role={loadError ? 'alert' : 'status'} className="text-[9px] uppercase tracking-[0.2em] text-[#A88417]">{loadError || (loadingProduct ? 'Loading the live collection' : 'Piece not found')}</p><h1 className="mt-3 font-serif text-3xl">{loadError ? 'The collection is unavailable.' : loadingProduct ? 'One moment.' : 'This piece has moved on.'}</h1><Link to="/" className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#A88417]"><ArrowLeft size={15} /> Back to collection</Link></section>
  }

  const variants = product.category === 'Clothes' ? ['XS', 'S', 'M', 'L', 'XL'] : product.category === 'Jewelries' ? ['Gold', 'Silver'] : ['Single']
  const images = product.images?.length ? product.images : [product.image]
  const benefits = product.benefits ?? []
  const showImage = (index: number) => {
    const nextIndex = (index + images.length) % images.length
    setActiveImage(nextIndex)
    imageTrack.current?.scrollTo({ left: nextIndex * imageTrack.current.clientWidth, behavior: 'smooth' })
  }

  const addProduct = () => {
    if (requestUserAccess()) addToCart(product, quantity)
  }
  const buyNow = () => {
    if (requestUserAccess()) {
      addToCart(product, quantity)
      navigate('/checkout')
    }
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 text-[var(--ink)] sm:px-7 sm:py-9 lg:px-10">
      <Link to="/" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] transition hover:text-[#A88417]"><ArrowLeft size={14} /> Back to collection</Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div className="relative aspect-[4/4.5] overflow-hidden bg-[var(--image-bg)] sm:aspect-[4/3.7]">
          <div ref={imageTrack} onScroll={(event) => setActiveImage(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))} className="flex size-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {images.map((image, index) => <div key={image} className="h-full min-w-full snap-center"><img src={image.replace('w=900', 'w=1600')} alt={`${product.name}, view ${index + 1}`} className="size-full object-cover" fetchPriority={index === 0 ? 'high' : 'auto'} /></div>)}
          </div>
          {images.length > 1 && <><button type="button" aria-label="Previous product image" onClick={() => showImage(activeImage - 1)} className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#D4AF37]/70 bg-[#090A08]/75 text-[#E5C75E] transition hover:bg-[#D4AF37] hover:text-[#17150E]"><ChevronLeft size={20} /></button><button type="button" aria-label="Next product image" onClick={() => showImage(activeImage + 1)} className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#D4AF37]/70 bg-[#090A08]/75 text-[#E5C75E] transition hover:bg-[#D4AF37] hover:text-[#17150E]"><ChevronRight size={20} /></button><div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/55 px-3 py-2">{images.map((image, index) => <button key={image} type="button" aria-label={`Show product image ${index + 1}`} aria-pressed={activeImage === index} onClick={() => showImage(index)} className={`size-1.5 rounded-full ${activeImage === index ? 'bg-[#D4AF37]' : 'bg-white/55'}`} />)}</div></>}
          {product.label && <span className="absolute left-4 top-4 bg-[var(--surface)] px-3 py-2 text-[9px] font-semibold tracking-[0.16em]">{product.label}</span>}
        </div>
        <div className="flex flex-col py-1 lg:py-5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#A88417]">{product.category} · Sandiego Collections</p>
          <h1 className="mt-3 font-serif text-[34px] leading-tight sm:text-[43px]">{product.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2"><RatingStars rating={product.rating} /><span className="text-[12px] font-medium">{product.rating.toFixed(1)}</span><a href="#reviews" className="text-[11px] text-[var(--muted)] underline underline-offset-4">{product.reviewCount} customer reviews</a></div>
          <p className="mt-6 border-b border-[var(--line)] pb-6 text-[23px] font-medium">{formatPrice(product.price)}</p>
          {product.description && <p className="mt-5 text-[12px] leading-6 text-[var(--muted)]">{product.description}</p>}

          <div className="mt-6">
            <div className="flex items-center justify-between"><label htmlFor="product-variant" className="text-[10px] font-semibold uppercase tracking-[0.14em]">{product.category === 'Clothes' ? 'Select size' : product.category === 'Jewelries' ? 'Finish' : 'Pack size'}</label>{product.category === 'Clothes' && <span className="text-[10px] text-[var(--muted)]">Size guide</span>}</div>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Select product variant">{variants.map((option) => <button key={option} type="button" aria-pressed={variant === option} onClick={() => setVariant(option)} className={`min-w-12 border px-3 py-2.5 text-[11px] transition ${variant === option ? 'border-[#17150E] bg-[#17150E] text-white' : 'border-[var(--line)] hover:border-[#D4AF37]'}`}>{option}</button>)}</div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex h-11 items-center border border-[var(--line)]"><button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex size-10 items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-40"><Minus size={14} /></button><span className="w-7 text-center text-[12px]">{quantity}</span><button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => value + 1)} className="flex size-10 items-center justify-center text-[var(--muted)] hover:text-[var(--ink)]"><Plus size={14} /></button></div>
            <button type="button" onClick={addProduct} className="flex h-11 flex-1 items-center justify-center gap-2 bg-[#D4AF37] px-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#17150E] transition hover:bg-[#E5C75E]">Add to cart <ArrowRight size={14} /></button>
            <button type="button" onClick={() => { if (requestUserAccess()) toggleWishlist(product) }} aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'} aria-pressed={isWishlisted} className={`flex size-11 items-center justify-center border border-[var(--line)] transition hover:border-[#D4AF37] ${isWishlisted ? 'text-[#A88417]' : 'text-[var(--ink)]'}`}><Heart size={17} fill={isWishlisted ? 'currentColor' : 'none'} /></button>
          </div>
          <button type="button" onClick={buyNow} className="mt-3 h-11 border border-[var(--ink)] text-[10px] font-semibold uppercase tracking-[0.12em] transition hover:bg-[var(--ink)] hover:text-[var(--surface)]">Buy now</button>

          <div className="mt-7 grid grid-cols-2 gap-3 border-y border-[var(--line)] py-4 text-[10px] text-[var(--muted)]"><p className="flex items-center gap-2"><Truck size={15} className="shrink-0 text-[#A88417]" /> Delivery available</p><p className="flex items-center gap-2"><ShieldCheck size={15} className="shrink-0 text-[#A88417]" /> Secure checkout</p></div>
          {benefits.length > 0 && <section className="mt-6"><h2 className="font-serif text-[21px]">Product benefits</h2><ul className="mt-3 space-y-2.5">{benefits.map((benefit) => <li key={benefit} className="flex gap-2.5 text-[11px] leading-5 text-[var(--muted)]"><Check size={14} className="mt-0.5 shrink-0 text-[#A88417]" />{benefit}</li>)}</ul></section>}
          <section id="reviews" className="mt-7 border-t border-[var(--line)] pt-5"><h2 className="font-serif text-[21px]">Customer notes</h2><div className="mt-3 flex items-center gap-3"><span className="font-serif text-3xl">{product.rating.toFixed(1)}</span><div><RatingStars rating={product.rating} /><p className="mt-1 text-[10px] text-[var(--muted)]">Based on {product.reviewCount} customer reviews</p></div></div><p className="mt-3 text-[11px] leading-5 text-[var(--muted)]">Customer feedback is reflected in this product’s current rating. Reviews will appear here as verified orders are received.</p></section>
        </div>
      </div>
    </div>
  )
}
