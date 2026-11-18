import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Droplets, Gem, Heart, Shirt, Sparkles, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useShop } from '../context/useShop'
import { apiRequest } from '../lib/api'
import type { Product, ProductCategory } from '../data/products'

const categoryDetails: { name: ProductCategory; description: string; Icon: typeof Shirt }[] = [
  { name: 'Clothes', description: 'Easy pieces, considered silhouettes.', Icon: Shirt },
  { name: 'Jewelries', description: 'Finishing touches with a little feeling.', Icon: Gem },
  { name: 'Organic Soap', description: 'Simple rituals, closer to nature.', Icon: Droplets },
  { name: 'Cream', description: 'Everyday care with a softer touch.', Icon: Sparkles },
]
const formatPrice = (value: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value)

export default function Categories() {
  const [selected, setSelected] = useState<ProductCategory | 'All'>('All')
  const [remoteProducts, setRemoteProducts] = useState<Product[]>([])
  const [loadError, setLoadError] = useState('')
  const { requestUserAccess } = useAuth()
  const { addToCart, toggleWishlist } = useShop()
  const catalog = useMemo(() => remoteProducts, [remoteProducts])
  const visibleProducts = selected === 'All' ? catalog : catalog.filter((product) => product.category === selected)

  useEffect(() => {
    let active = true
    const refresh = () => apiRequest<{ products: Product[] }>('/products').then(({ products }) => { if (active) { setRemoteProducts(products); setLoadError('') } }).catch((error: Error) => { if (active) setLoadError(error.message) })
    refresh()
    const timer = window.setInterval(refresh, 15000)
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('sandiego-products') : null
    channel?.addEventListener('message', refresh)
    return () => {
      active = false
      window.clearInterval(timer)
      channel?.removeEventListener('message', refresh)
      channel?.close()
    }
  }, [])

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--ink)]">
      <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-7 sm:py-10 lg:px-10">
        <header className="border-b border-[var(--line)] pb-6"><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#A88417]">Explore the edit</p><h1 className="mt-2 font-serif text-[34px] sm:text-[42px]">Find your something.</h1><p className="mt-2 max-w-xl text-[12px] leading-5 text-[var(--muted)]">A considered mix of personal style, meaningful details, and everyday care.</p></header>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {categoryDetails.map(({ name, description, Icon }) => {
            const count = catalog.filter((product) => product.category === name).length
            return <button key={name} type="button" aria-pressed={selected === name} onClick={() => setSelected((current) => current === name ? 'All' : name)} className={`group relative isolate flex min-h-[180px] flex-col justify-end overflow-hidden border border-[var(--line)] bg-[radial-gradient(ellipse_at_75%_25%,rgba(212,175,55,0.13),transparent_48%),var(--surface)] p-4 text-left text-[var(--ink)] transition hover:border-[#D4AF37] sm:min-h-[235px] sm:p-5 ${selected === name ? 'outline outline-2 outline-[#D4AF37]' : ''}`}>
              <Icon size={42} strokeWidth={1} className="absolute right-4 top-4 text-[#D4AF37]/50 transition duration-500 group-hover:scale-110 group-hover:text-[#D4AF37]" />
              <span className="text-[8px] uppercase tracking-[0.14em] text-[#E5C75E]">{count} {count === 1 ? 'piece' : 'pieces'}</span><span className="mt-1 font-serif text-[19px] sm:text-[23px]">{name}</span><span className="mt-1 text-[9px] leading-4 text-white/70">{description}</span>
            </button>
          })}
        </div>
        <section id="category-products" className="scroll-mt-24 mt-9">
          {loadError && <p role="alert" className="mb-4 border-l-2 border-[#D4AF37] bg-[#D4AF37]/10 px-4 py-3 text-[11px] text-[#A88417]">{loadError}</p>}
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-4"><div><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#A88417]">Live collection</p><h2 className="mt-1 font-serif text-[25px]">{selected === 'All' ? 'All categories' : selected}</h2></div><div className="flex items-center gap-3"><span className="text-[10px] text-[var(--muted)]">{visibleProducts.length} pieces</span><button type="button" onClick={() => setSelected('All')} className="text-[9px] uppercase tracking-[0.12em] text-[#A88417]">View all</button></div></div>
          {visibleProducts.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">{visibleProducts.map((product) => <article key={product.id} className="group min-w-0"><Link to={`/product/${product.id}`} className="relative block aspect-[4/5] overflow-hidden bg-[var(--image-bg)]"><img src={product.images?.[0] || product.image} alt={product.name} loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" /><span className="absolute left-3 top-3 bg-[var(--surface)]/90 px-2 py-1 text-[8px] uppercase tracking-[0.1em] text-[var(--ink)]">{product.category}</span></Link><div className="pt-3"><div className="flex items-center justify-between gap-2"><Link to={`/product/${product.id}`} className="truncate font-serif text-[15px] hover:text-[#A88417]">{product.name}</Link><span className="flex shrink-0 items-center gap-1 text-[10px] text-[#A88417]"><Star size={11} fill="currentColor" />{product.rating.toFixed(1)}</span></div><p className="mt-1.5 text-[12px]">{formatPrice(product.price)}</p><div className="mt-3 flex gap-2"><button type="button" aria-label={`Save ${product.name}`} onClick={() => { if (requestUserAccess()) toggleWishlist(product) }} className="flex size-9 items-center justify-center border border-[var(--line)] hover:border-[#D4AF37] hover:text-[#A88417]"><Heart size={15} /></button><button type="button" onClick={() => { if (requestUserAccess()) addToCart(product) }} className="flex h-9 flex-1 items-center justify-center gap-2 bg-[#D4AF37] text-[9px] font-semibold uppercase tracking-[0.1em] text-[#17150E] hover:bg-[#E5C75E]">Add to bag <ArrowRight size={13} /></button></div></div></article>)}</div> : <p className="border border-[var(--line)] px-5 py-12 text-center text-[12px] text-[var(--muted)]">New pieces are on their way.</p>}
        </section>
      </div>
    </div>
  )
}
