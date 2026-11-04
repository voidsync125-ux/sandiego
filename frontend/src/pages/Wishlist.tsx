import { ArrowRight, Heart, ShoppingBag, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useShop } from '../context/useShop'

const formatPrice = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)

export default function Wishlist() {
  const { wishlistItems, toggleWishlist, addToCart } = useShop()

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 text-[var(--ink)] sm:px-7 sm:py-11 lg:px-10">
      <div className="flex items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#A88417]">Kept close</p><h1 className="mt-2 font-serif text-[32px] sm:text-[40px]">Your wishlist</h1><p className="mt-2 text-[12px] text-[var(--muted)]">{wishlistItems.length} saved {wishlistItems.length === 1 ? 'piece' : 'pieces'}</p></div>
        <Heart size={21} className="mb-1 text-[#A88417]" strokeWidth={1.5} />
      </div>

      {wishlistItems.length ? (
        <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
          {wishlistItems.map((product) => (
            <article key={product.id} className="group min-w-0">
              <Link to={`/product/${product.id}`} className="relative block aspect-[4/5] overflow-hidden bg-[var(--image-bg)]">
                <img src={product.image} alt={product.name} loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                <span className="absolute left-3 top-3 bg-[var(--surface)]/95 px-2.5 py-1.5 text-[8px] uppercase tracking-[0.14em]">{product.category}</span>
              </Link>
              <div className="pt-3.5">
                <div className="flex items-start justify-between gap-2"><Link to={`/product/${product.id}`} className="truncate font-serif text-[15px] hover:text-[#A88417]">{product.name}</Link><button type="button" onClick={() => toggleWishlist(product)} aria-label={`Remove ${product.name} from wishlist`} className="shrink-0 text-[var(--muted)] hover:text-[#A88417]"><Trash2 size={14} /></button></div>
                <p className="mt-1.5 text-[12px]">{formatPrice(product.price)}</p>
                <button type="button" onClick={() => { addToCart(product); toggleWishlist(product) }} className="mt-3 flex h-10 w-full items-center justify-center gap-2 border border-[#D4AF37] text-[9px] font-semibold uppercase tracking-[0.12em] transition hover:bg-[#D4AF37] hover:text-[#17150E]"><ShoppingBag size={14} /> Move to bag <ArrowRight size={13} /></button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center"><Heart size={25} className="mx-auto text-[#A88417]" strokeWidth={1.4} /><h2 className="mt-4 font-serif text-[24px]">Nothing saved for later.</h2><p className="mt-2 text-[12px] text-[var(--muted)]">Tap the heart on a piece to keep it close.</p><Link to="/" className="mt-6 inline-flex h-10 items-center gap-2 bg-[#D4AF37] px-4 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#17150E]">Explore the collection <ArrowRight size={14} /></Link></div>
      )}
    </div>
  )
}
