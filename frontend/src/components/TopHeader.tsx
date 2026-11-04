import { Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { Link } from 'react-router-dom'

type TopHeaderProps = {
  searchQuery: string
  onSearchChange: (value: string) => void
  cartCount: number
  onCartClick: () => void
}

export default function TopHeader({ searchQuery, onSearchChange, cartCount, onCartClick }: TopHeaderProps) {
  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-[76px] items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)]/95 pl-[72px] pr-4 backdrop-blur-md sm:pl-[82px] sm:pr-7 md:left-64 md:px-9">
      <label className="flex h-10 min-w-0 max-w-[590px] flex-1 items-center gap-3 border border-[var(--line)] bg-[var(--page-bg)] px-3.5 transition focus-within:border-[#D4AF37] sm:px-4">
        <Search size={17} className="shrink-0 text-[var(--muted)]" strokeWidth={1.7} />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search pieces, materials, collections..."
          aria-label="Search products"
          className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)] sm:text-[13px]"
        />
        {searchQuery && (
          <button type="button" aria-label="Clear search" onClick={() => onSearchChange('')} className="text-[var(--muted)] hover:text-[var(--ink)]">
            <X size={15} />
          </button>
        )}
      </label>
      <button
        type="button"
        onClick={onCartClick}
        aria-label={`Open shopping bag, ${cartCount} items`}
        className="relative flex size-10 shrink-0 items-center justify-center border border-[var(--line)] text-[var(--ink)] transition hover:border-[#D4AF37] hover:text-[#A88417]"
      >
        <ShoppingBag size={18} strokeWidth={1.6} />
        <span className="absolute -right-1.5 -top-1.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#D4AF37] px-1 text-[9px] font-semibold leading-none text-[#17150E]">
          {cartCount > 99 ? '99+' : cartCount}
        </span>
      </button>
      <Link to="/account/dashboard" aria-label="Open your account" className="flex size-10 shrink-0 items-center justify-center border border-[var(--line)] text-[var(--ink)] transition hover:border-[#D4AF37] hover:text-[#A88417]"><UserRound size={17} strokeWidth={1.6} /></Link>
    </header>
  )
}
