import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import {
  ChevronRight,
  CircleHelp,
  Heart,
  Home,
  Menu,
  Moon,
  PackageSearch,
  Phone,
  ShoppingBag,
  Sun,
  X,
} from 'lucide-react'

type SideNavbarProps = {
  isLight: boolean
  onThemeToggle: () => void
}

const navigation = [
  { label: 'Home', href: '/store', icon: Home },
  { label: 'Categories', href: '/categories', icon: ShoppingBag },
  { label: 'Wishlist', href: '/wishlist', icon: Heart },
  { label: 'Order Tracking', href: '/order-tracking', icon: PackageSearch },
  { label: 'About Us', href: '/about-us', icon: CircleHelp },
  { label: 'Contact Us', href: '/contact', icon: Phone },
]

function Brand({ isLight }: { isLight: boolean }) {
  return (
    <Link to="/store" className="group flex items-center gap-3" aria-label="Sandiego Collections home">
      <span className="flex size-10 items-center justify-center border border-[#D4AF37]/60 text-[#D4AF37]">
        <ShoppingBag size={18} strokeWidth={1.5} />
      </span>
      <span className="min-w-0">
        <span className={`block font-serif text-[17px] leading-tight tracking-wide ${isLight ? 'text-[#191914]' : 'text-white'}`}>Sandiego</span>
        <span className={`mt-1 block text-[9px] uppercase tracking-[0.24em] ${isLight ? 'text-[#191914]/50' : 'text-white/50'}`}>Collections</span>
      </span>
    </Link>
  )
}

function NavigationLinks({ onSelect, isLight }: { onSelect?: () => void; isLight: boolean }) {
  const location = useLocation()
  const isCurrent = (href: string) =>
    (href.includes('#') && location.pathname === href.split('#')[0] && location.hash === `#${href.split('#')[1]}`) ||
    (!href.includes('#') && location.pathname === href)

  return (
    <nav aria-label="Main navigation" className="mt-12">
      <p className={`mb-4 px-3 text-[9px] font-semibold uppercase tracking-[0.22em] ${isLight ? 'text-[#191914]/40' : 'text-white/35'}`}>Discover</p>
      <div className="space-y-1">
        {navigation.map(({ label, href, icon: Icon }) => (
          <NavLink
            key={href}
            to={href}
            onClick={() => {
              onSelect?.()
            }}
            className={() => `group flex items-center gap-3 border-l px-3 py-3 text-[13px] transition-colors ${
              isCurrent(href)
                ? isLight ? 'border-[#A88417] bg-black/[0.04] text-[#191914]' : 'border-[#D4AF37] bg-white/[0.055] text-white'
                : isLight ? 'border-transparent text-[#191914]/60 hover:border-[#A88417]/50 hover:text-[#191914]' : 'border-transparent text-white/55 hover:border-[#D4AF37]/50 hover:text-white'
            }`}
          >
            <Icon size={16} strokeWidth={1.6} className={isCurrent(href) ? 'text-[#A88417]' : isLight ? 'text-[#191914]/45 group-hover:text-[#A88417]' : 'text-white/45 group-hover:text-[#D4AF37]'} />
            <span className="flex-1">{label}</span>
            <ChevronRight size={13} className="opacity-0 transition-opacity group-hover:opacity-50" />
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default function SideNavbar({ isLight, onThemeToggle }: SideNavbarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { role, profile } = useAuth()
  const railClass = isLight ? 'border-[#A88417]/25 bg-[#EAE9E4]' : 'border-[#D4AF37]/20 bg-[#090A08]'
  const bodyTextClass = isLight ? 'text-[#191914]/70' : 'text-white/65'
  const displayName = role === 'guest' ? 'Guest Account' : profile?.fullName || (role === 'admin' ? 'Administrator' : 'Customer')
  const status = role === 'admin' ? 'Verified administrator' : role === 'customer' ? 'Signed in customer' : 'Shopping as guest'
  const avatar = role === 'guest' ? 'SC' : displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const profilePath = role === 'admin' ? '/admin-dashboard' : role === 'customer' ? '/account/dashboard' : '/account'

  return (
    <>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open navigation menu"
        className="fixed left-4 top-4 z-50 flex size-11 items-center justify-center bg-[#D4AF37] text-[#11110E] shadow-lg shadow-black/25 transition hover:bg-[#E4C45E] md:hidden"
      >
        <Menu size={20} />
      </button>

      <aside className={`fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r px-6 py-7 md:flex ${railClass}`}>
        <Brand isLight={isLight} />
        <NavigationLinks isLight={isLight} />
        <div className="mt-auto">
          <button
            type="button"
            role="switch"
            aria-checked={isLight}
            onClick={onThemeToggle}
            className={`flex w-full items-center justify-between border-y py-4 text-left ${isLight ? 'border-black/10' : 'border-white/10'}`}
          >
            <span className={`flex items-center gap-3 text-[12px] ${bodyTextClass}`}>
              {isLight ? <Sun size={16} className="text-[#D4AF37]" /> : <Moon size={16} className="text-[#D4AF37]" />}
              {isLight ? 'Light appearance' : 'Dark appearance'}
            </span>
            <span className={`relative h-[18px] w-9 border transition-colors ${isLight ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-white/25 bg-white/10'}`}>
              <span className={`absolute top-[2px] size-3 transition-all ${isLight ? 'left-[19px] bg-[#10100D]' : 'left-[2px] bg-white/80'}`} />
            </span>
          </button>
          <Link to={profilePath} className="flex items-center gap-3 pt-5">
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#D4AF37]/45 bg-[#D4AF37]/10 font-serif text-[12px] text-[#A88417]">{profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" className="size-full object-cover" /> : avatar}</span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-[12px] ${isLight ? 'text-[#191914]' : 'text-white'}`}>{displayName}</span>
              <span className={`mt-1 flex items-center gap-1.5 text-[10px] ${isLight ? 'text-[#191914]/45' : 'text-white/40'}`}><span className={`size-1.5 rounded-full ${role === 'guest' ? 'bg-white/35' : 'bg-emerald-400'}`} /> {status}</span>
            </span>
          </Link>
        </div>
      </aside>

      <div className={`fixed inset-0 z-[60] md:hidden ${drawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!drawerOpen}>
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-black/65 transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside className={`absolute inset-0 flex flex-col px-7 pb-7 pt-6 transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${railClass} ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between">
            <Brand isLight={isLight} />
            <button type="button" aria-label="Close navigation menu" onClick={() => setDrawerOpen(false)} className="flex size-10 items-center justify-center border border-white/15 text-white/75 hover:border-[#D4AF37]/60 hover:text-[#D4AF37]">
              <X size={19} />
            </button>
          </div>
          <NavigationLinks isLight={isLight} onSelect={() => setDrawerOpen(false)} />
          <div className="mt-auto">
            <button type="button" role="switch" aria-checked={isLight} onClick={onThemeToggle} className={`flex w-full items-center justify-between border-y py-4 text-left text-[12px] ${bodyTextClass} ${isLight ? 'border-black/10' : 'border-white/10'}`}>
              <span className="flex items-center gap-3">{isLight ? <Sun size={16} className="text-[#D4AF37]" /> : <Moon size={16} className="text-[#D4AF37]" />}{isLight ? 'Light appearance' : 'Dark appearance'}</span>
              <span className={`relative h-[18px] w-9 border ${isLight ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-white/25 bg-white/10'}`}><span className={`absolute top-[2px] size-3 ${isLight ? 'left-[19px] bg-[#10100D]' : 'left-[2px] bg-white/80'}`} /></span>
            </button>
            <Link to={profilePath} onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 pt-5">
              <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#D4AF37]/45 bg-[#D4AF37]/10 font-serif text-[12px] text-[#A88417]">{profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" className="size-full object-cover" /> : avatar}</span>
              <span><span className={`block max-w-[230px] truncate text-[12px] ${isLight ? 'text-[#191914]' : 'text-white'}`}>{displayName}</span><span className={`mt-1 flex items-center gap-1.5 text-[10px] ${isLight ? 'text-[#191914]/45' : 'text-white/40'}`}><span className={`size-1.5 rounded-full ${role === 'guest' ? 'bg-white/35' : 'bg-emerald-400'}`} /> {status}</span></span>
            </Link>
            <p className={`mt-8 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] ${isLight ? 'text-[#191914]/40' : 'text-white/30'}`}><CircleHelp size={13} /> Here to help, whenever you need</p>
          </div>
        </aside>
      </div>
    </>
  )
}
