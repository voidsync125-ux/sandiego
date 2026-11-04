import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Heart, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useShop } from '../context/useShop'
import { useAuth } from '../context/useAuth'
import { apiRequest } from '../lib/api'
import type { Product } from '../data/products'

const naira = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 })

type HomeProps = {
  searchQuery: string
  onClearSearch: () => void
}

function Rating({ rating, count }: { rating: number; count: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex items-center gap-0.5 text-[#B89124]" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, index) => <Star key={index} size={11} strokeWidth={1.6} fill={index < Math.round(rating) ? 'currentColor' : 'none'} />)}
      </span>
      <span className="text-[10px] text-[var(--muted)]">({count})</span>
    </span>
  )
}

function ProductCard({ product, isWishlisted, onAddToCart, onToggleWishlist }: {
  product: Product
  isWishlisted: boolean
  onAddToCart: (product: Product) => void
  onToggleWishlist: (product: Product) => void
}) {
  return (
    <article className="group min-w-0">
      <div className="relative aspect-[4/5] overflow-hidden bg-[var(--image-bg)]">
        <Link to={`/product/${product.id}`} aria-label={`View ${product.name}`} className="absolute inset-0 z-0">
          <img src={product.images?.[0] || product.image} alt={product.name} loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.045]" />
          {product.label && <span className="absolute left-3 top-3 bg-[var(--surface)]/95 px-2.5 py-1.5 text-[8px] font-semibold tracking-[0.15em] text-[var(--ink)]">{product.label}</span>}
        </Link>
        <button type="button" onClick={() => onToggleWishlist(product)} aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`} aria-pressed={isWishlisted} className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-[var(--surface)]/95 text-[var(--ink)] transition hover:text-[#A88417]">
          <Heart size={16} strokeWidth={1.6} fill={isWishlisted ? 'currentColor' : 'none'} className={isWishlisted ? 'text-[#B89124]' : ''} />
        </button>
        <button type="button" onClick={() => onAddToCart(product)} className="absolute bottom-3 left-3 right-3 z-10 flex h-10 translate-y-2 items-center justify-center gap-2 bg-[#D4AF37] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#17150E] opacity-0 transition duration-300 hover:bg-[#E5C75E] group-hover:translate-y-0 group-hover:opacity-100 focus:translate-y-0 focus:opacity-100">
          Add to bag <ArrowRight size={13} />
        </button>
      </div>
      <div className="pt-3.5">
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <p className="truncate text-[9px] uppercase tracking-[0.15em] text-[var(--muted)]">{product.category}</p>
          <Rating rating={product.rating} count={product.reviewCount} />
        </div>
        <h3 className="truncate font-serif text-[16px] leading-snug text-[var(--ink)]"><Link to={`/product/${product.id}`} className="hover:text-[#A88417]">{product.name}</Link></h3>
        <p className="mt-1.5 text-[13px] font-medium text-[var(--ink)]">{naira.format(product.price)}</p>
        <button type="button" onClick={() => onAddToCart(product)} className="mt-3 flex h-9 w-full items-center justify-center gap-2 border border-[var(--line)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink)] transition hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#17150E] sm:hidden">
          Add to bag <ArrowRight size={13} />
        </button>
      </div>
    </article>
  )
}

export default function Home({ searchQuery, onClearSearch }: HomeProps) {
  const [backendProducts, setBackendProducts] = useState<Product[]>([])
  const [loadError, setLoadError] = useState('')
  const { addToCart, toggleWishlist, wishlistItems } = useShop()
  const { requestUserAccess } = useAuth()

  useEffect(() => {
    let mounted = true
    const refreshProducts = () => {
      apiRequest<{ products: Product[] }>('/products')
        .then(({ products: remoteProducts }) => { if (mounted) { setBackendProducts(remoteProducts); setLoadError('') } })
        .catch((error: Error) => { if (mounted) setLoadError(error.message) })
    }
    refreshProducts()
    const interval = window.setInterval(refreshProducts, 5000)
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('sandiego-products') : null
    channel?.addEventListener('message', refreshProducts)
    return () => {
      mounted = false
      window.clearInterval(interval)
      channel?.removeEventListener('message', refreshProducts)
      channel?.close()
    }
  }, [])

  const catalog = backendProducts

  const visibleProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    return catalog.filter((product) => {
      return !normalizedQuery || `${product.name} ${product.category}`.toLowerCase().includes(normalizedQuery)
    })
  }, [catalog, searchQuery])

  const trendingProducts = useMemo(
    () => [...catalog].sort((left, right) => right.rating - left.rating || right.reviewCount - left.reviewCount).slice(0, 4),
    [catalog],
  )

  const wishlistIds = wishlistItems.map((product) => product.id)
  const addForCustomer = (product: Product) => {
    if (requestUserAccess()) addToCart(product)
  }
  const saveForCustomer = (product: Product) => {
    if (requestUserAccess()) toggleWishlist(product)
  }
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--ink)]">
      <div className="mx-auto max-w-[1500px] px-4 pb-16 pt-5 sm:px-7 lg:px-10">
        <section id="home" aria-label="Sandiego Collections featured collection" className="relative isolate flex min-h-[360px] items-end overflow-hidden bg-[#17150E] px-6 py-8 text-white sm:min-h-[420px] sm:px-10 sm:py-10 lg:min-h-[460px] lg:px-14">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_22%,rgba(212,175,55,0.16),transparent_42%),linear-gradient(120deg,#17150E_0%,#1F1D16_55%,#11120F_100%)]" />
          <div className="pointer-events-none absolute -right-16 -top-20 size-[280px] rounded-full border border-[#D4AF37]/15 sm:right-[8%] sm:size-[390px]" />
          <div className="pointer-events-none absolute -right-8 -top-12 size-[220px] rounded-full border border-[#D4AF37]/10 sm:right-[calc(8%+32px)] sm:size-[326px]" />
          <div className="relative max-w-[560px]">
            <p className="flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#E5C75E]"><span className="h-px w-7 bg-[#D4AF37]" /> Sandiego Collections</p>
            <h1 className="mt-4 font-serif text-[34px] leading-[1.05] sm:text-[48px]">A considered collection,<br /><span className="italic text-[#D4AF37]">chosen with care.</span></h1>
            <p className="mt-4 max-w-md text-[11px] leading-5 text-white/60 sm:text-[12px]">Personal style and everyday rituals, thoughtfully selected for the way you live.</p>
            <Link to="/categories" className="mt-6 inline-flex h-10 items-center gap-2 bg-[#D4AF37] px-4 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#17150E] transition hover:bg-[#E5C75E]">Explore the collection <ArrowRight size={13} /></Link>
          </div>
        </section>

        <section id="categories" className="scroll-mt-24 pt-10 sm:pt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#A88417]">New arrivals · Updated live</p>
              <h2 className="mt-2 font-serif text-[27px] leading-tight sm:text-[32px]">Just dropped</h2>
              <p className="mt-1.5 text-[11px] text-[var(--muted)]">Fresh finds across clothing, jewelry, and considered body care.</p>
            </div>
            <a href="#product-grid" className="hidden items-center gap-2 pb-1 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] transition hover:text-[#A88417] sm:flex">View pieces <ArrowRight size={13} /></a>
          </div>
        </section>

        <section id="product-grid" className="scroll-mt-24 pt-8 sm:pt-10">
          <div className="mb-5 flex items-end justify-between border-b border-[var(--line)] pb-4">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#A88417]">The latest edit</p>
              <h2 className="mt-1.5 font-serif text-[24px] sm:text-[29px]">New arrivals</h2>
            </div>
            <span className="pb-1 text-[10px] text-[var(--muted)]">{visibleProducts.length} pieces</span>
          </div>
          {loadError && <p role="alert" className="mb-4 border-l-2 border-[#D4AF37] bg-[#D4AF37]/10 px-4 py-3 text-[11px] text-[#A88417]">{loadError}</p>}
          {visibleProducts.length ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10">
              {visibleProducts.map((product) => <ProductCard key={product.id} product={product} isWishlisted={wishlistIds.includes(product.id)} onAddToCart={addForCustomer} onToggleWishlist={saveForCustomer} />)}
            </div>
          ) : (
            <div className="border border-[var(--line)] px-6 py-16 text-center">
              <p className="font-serif text-xl">{searchQuery ? 'Nothing found just yet.' : 'The collection is being prepared.'}</p>
              <p className="mt-2 text-[12px] text-[var(--muted)]">{searchQuery ? 'Try another search or category.' : 'New pieces will appear here when an administrator publishes them.'}</p>
              <button type="button" onClick={onClearSearch} className="mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A88417]">Clear search</button>
            </div>
          )}
        </section>

        {trendingProducts.length > 0 && <section id="trending" className="scroll-mt-24 mt-14 border-t border-[var(--line)] pt-8 sm:mt-18 sm:pt-10">
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#A88417]">Loved and shared</p><h2 className="mt-2 font-serif text-[27px] sm:text-[32px]">Most gifted</h2><p className="mt-1.5 text-[11px] text-[var(--muted)]">A few favourites customers keep coming back to.</p></div><span className="hidden items-center gap-2 pb-1 text-[9px] uppercase tracking-[0.12em] text-[var(--muted)] sm:flex"><Heart size={14} className="text-[#A88417]" /> Customer favourites</span></div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">{trendingProducts.map((product) => <ProductCard key={product.id} product={product} isWishlisted={wishlistIds.includes(product.id)} onAddToCart={addForCustomer} onToggleWishlist={saveForCustomer} />)}</div>
        </section>}

        <footer className="mt-12 flex flex-col gap-5 border-t border-[var(--line)] pt-7 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="font-serif text-[19px]">Sandiego <span className="text-[#A88417]">Collections</span></p><p className="mt-1.5 text-[10px] text-[var(--muted)]">Good things, chosen with care.</p></div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-[var(--muted)]"><Link to="/about-us" className="hover:text-[#A88417]">About us</Link><Link to="/contact" className="hover:text-[#A88417]">Contact</Link><Link to="/order-tracking" className="hover:text-[#A88417]">Track an order</Link></div>
        </footer>
      </div>
    </div>
  )
}
