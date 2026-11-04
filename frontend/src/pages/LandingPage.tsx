import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Droplets, Gem, Leaf, Shirt, ShoppingBag, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

const collectionMarks = [
  { title: 'APPAREL', Icon: Shirt, accent: 'from-[#D4AF37]/20 to-transparent' },
  { title: 'JEWELRY', Icon: Gem, accent: 'from-[#D4AF37]/15 to-transparent' },
  { title: 'BODY CARE', Icon: Droplets, accent: 'from-[#8F9B6A]/20 to-transparent' },
  { title: 'WELLNESS', Icon: Leaf, accent: 'from-[#A88417]/15 to-transparent' },
]
const animationFrames = ['Top (Shirt)', 'Trousers', 'Shorts', 'Soap Bar', 'Cream Bottle', 'Jewelry (Necklace/Ring)']

function ApparelWellnessMark({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="flex items-center gap-3" aria-live="off">
      <svg viewBox="0 0 120 120" className="size-[76px] shrink-0 sm:size-[88px]" role="img" aria-label={`${animationFrames[activeIndex]} outline`}>
        <g className={`morph-icon ${activeIndex === 0 ? 'morph-icon-active' : ''}`}><path d="M43 22 28 30 17 50l17 9 7-11v49h38V48l7 11 17-9-11-20-15-8-8 9H51z" /></g>
        <g className={`morph-icon ${activeIndex === 1 ? 'morph-icon-active' : ''}`}><path d="M36 19h48l-4 30-7 52H54l-4-42-4 42H27l6-52z" /><path d="M36 19q24 10 48 0M51 61h18" /></g>
        <g className={`morph-icon ${activeIndex === 2 ? 'morph-icon-active' : ''}`}><path d="M35 21h50l-5 36-8 44H53l-4-38-8 38H24l7-44z" /><path d="M35 21q25 10 50 0M51 63h18" /></g>
        <g className={`morph-icon ${activeIndex === 3 ? 'morph-icon-active' : ''}`}><path d="m27 40 66-8 5 48-66 8z" /><path d="m36 49 47-6M39 61l34-4" /></g>
        <g className={`morph-icon ${activeIndex === 4 ? 'morph-icon-active' : ''}`}><path d="M48 18h24v13l9 9v51a8 8 0 0 1-8 8H47a8 8 0 0 1-8-8V40l9-9z" /><path d="M48 18h24M41 54h38M55 17v-6h10v7" /></g>
        <g className={`morph-icon ${activeIndex === 5 ? 'morph-icon-active' : ''}`}><path d="M24 37q36 59 72 0" /><circle cx="60" cy="71" r="13" /><path d="M31 44 24 52m65-8 7 8M60 58v-5" /></g>
      </svg>
      <span className="min-w-[155px] border-l border-[#D4AF37]/35 pl-3">
        <span className="block text-[8px] uppercase tracking-[0.18em] text-white/40">Now taking shape</span>
        <span className="mt-1 block font-serif text-[15px] text-[#E5C75E]">{animationFrames[activeIndex]}</span>
      </span>
    </div>
  )
}

export default function LandingPage() {
  const [activeFrame, setActiveFrame] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setActiveFrame((frame) => (frame + 1) % animationFrames.length), 3000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <main className="min-h-screen overflow-hidden bg-[#090A08] text-white">
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10 sm:py-7 lg:px-16">
        <Link to="/" className="flex items-center gap-3" aria-label="Sandiego Collections home">
          <span className="flex size-10 items-center justify-center border border-[#D4AF37]/60 text-[#D4AF37]"><ShoppingBag size={18} strokeWidth={1.4} /></span>
          <span><span className="block font-serif text-[16px] leading-tight">Sandiego</span><span className="mt-1 block text-[8px] uppercase tracking-[0.25em] text-white/45">Collections</span></span>
        </Link>
        <Link to="/account" className="hidden items-center gap-2 text-[9px] uppercase tracking-[0.15em] text-white/65 transition hover:text-[#E5C75E] sm:inline-flex">Your account <ArrowUpRight size={13} /></Link>
      </header>

      <section className="relative grid min-h-[calc(100svh-78px)] items-center gap-8 px-5 pb-14 pt-6 sm:px-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-6 lg:px-16 lg:pb-20 lg:pt-0">
        <div className="pointer-events-none absolute -left-36 top-1/4 size-[420px] rounded-full bg-[#D4AF37]/[0.035] blur-[110px]" />
        <div className="relative z-10 max-w-[590px] animate-[rise-in_900ms_cubic-bezier(.2,.8,.2,1)_both]">
          <p className="mb-5 flex items-center gap-3 text-[9px] uppercase tracking-[0.24em] text-[#E5C75E]"><span className="h-px w-8 bg-[#D4AF37]" /> Thoughtfully chosen in Lagos</p>
          <h1 className="font-serif text-[54px] leading-[0.96] sm:text-[76px] lg:text-[86px]">Sandiego<br /><span className="italic text-[#D4AF37]">Collections</span></h1>
          <p className="mt-6 max-w-md text-[13px] leading-6 text-white/65 sm:text-[14px]">Personal style, meaningful details, and everyday rituals chosen to make feeling good part of the way you live.</p>
          <div className="mt-5"><ApparelWellnessMark activeIndex={activeFrame} /></div>
          <Link to="/account" className="entry-glow mt-8 inline-flex h-13 items-center justify-center gap-3 bg-[#D4AF37] px-6 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#17150E] transition hover:bg-[#E5C75E] sm:h-14 sm:px-8">Enter store / Shop now <ArrowRight size={15} /></Link>
          <div className="mt-8 grid max-w-[410px] grid-cols-3 border-y border-white/10 py-4">
            <p className="flex items-center gap-2 text-[9px] text-white/55"><Gem size={13} className="text-[#D4AF37]" />Jewelry</p>
            <p className="flex items-center gap-2 text-[9px] text-white/55"><Sparkles size={13} className="text-[#D4AF37]" />Personal style</p>
            <p className="flex items-center gap-2 text-[9px] text-white/55"><Leaf size={13} className="text-[#D4AF37]" />Body care</p>
          </div>
          <a href="#discover" className="mt-8 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-white/40 transition hover:text-[#E5C75E]">Discover Sandiego <ArrowDown size={13} /></a>
        </div>

        <div className="relative -mx-5 flex min-h-[280px] items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_55%_45%,rgba(212,175,55,0.12),transparent_58%)] px-6 py-8 sm:mx-0 sm:min-h-[360px] lg:min-h-[min(65vh,610px)]" aria-label="Sandiego Collections: apparel, jewelry, body care, and wellness">
          <div className="pointer-events-none absolute left-1/2 top-1/2 size-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#D4AF37]/10 sm:size-[390px] lg:size-[470px]" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 size-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#D4AF37]/10 sm:size-[320px] lg:size-[390px]" />
          <div className="relative grid w-full max-w-[500px] grid-cols-2 gap-3 sm:gap-4">
            {collectionMarks.map(({ title, Icon, accent }) => <div key={title} className={`flex min-h-[112px] flex-col justify-between border border-[#D4AF37]/15 bg-gradient-to-br ${accent} p-4 sm:min-h-[150px] sm:p-5`}><Icon size={24} strokeWidth={1.1} className="text-[#D4AF37]" /><span className="text-[8px] uppercase tracking-[0.2em] text-white/55">{title}</span></div>)}
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-y border-[#D4AF37]/20 bg-[#D4AF37]/[0.035] py-4">
        <div className="landing-marquee flex w-max items-center gap-8 whitespace-nowrap text-[10px] uppercase tracking-[0.22em] text-[#E5C75E]/80 sm:gap-12 sm:text-[11px]">
          {Array.from({ length: 6 }, (_, index) => <span key={index} className="flex items-center gap-8 sm:gap-12"><span>We care about your well being</span><span className="text-[#D4AF37]">✳</span></span>)}
        </div>
      </div>

      <section id="discover" className="grid gap-8 px-5 py-10 sm:grid-cols-[1fr_auto] sm:items-end sm:px-10 sm:py-12 lg:px-16">
        <div><p className="text-[9px] uppercase tracking-[0.2em] text-[#D4AF37]">Good things, chosen with care</p><h2 className="mt-2 max-w-xl font-serif text-[27px] leading-tight sm:text-[34px]">Find a piece for your wardrobe. Find a ritual for yourself.</h2></div>
        <Link to="/account" className="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/65 transition hover:text-[#E5C75E]">Step inside <ArrowRight size={14} /></Link>
        <Link to="/admin/login" className="justify-self-start text-[9px] uppercase tracking-[0.14em] text-white/35 underline decoration-white/15 underline-offset-4 transition hover:text-[#E5C75E] sm:col-span-2 sm:justify-self-end">Staff portal access</Link>
      </section>
    </main>
  )
}
