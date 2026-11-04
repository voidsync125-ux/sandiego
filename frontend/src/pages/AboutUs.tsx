import { ArrowRight, Gem, HeartHandshake, Leaf, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

const values = [
  { icon: Gem, title: 'Made to mean something', text: 'Jewelry and wardrobe pieces are chosen for the way they finish an outfit and find a place in your everyday.' },
  { icon: Leaf, title: 'Care, close to the source', text: 'Our soaps and creams begin with carefully considered, naturally inspired ingredients and straightforward rituals.' },
  { icon: HeartHandshake, title: 'Well-being, always', text: 'We believe the things you wear and the care you give yourself should help you feel more at home in your own skin.' },
]

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--ink)]">
      <section className="relative isolate flex min-h-[330px] items-end overflow-hidden bg-[radial-gradient(ellipse_at_75%_25%,rgba(212,175,55,0.13),transparent_42%),linear-gradient(125deg,#171712,#0d0e0b)] sm:min-h-[410px]">
        <div className="pointer-events-none absolute -right-20 top-[-170px] size-[420px] rounded-full border border-[#D4AF37]/15 sm:right-[8%] sm:size-[560px]" />
        <div className="mx-auto w-full max-w-[1280px] px-5 pb-10 sm:px-8 sm:pb-14 lg:px-12"><p className="text-[9px] uppercase tracking-[0.22em] text-[#E5C75E]">Our point of view</p><h1 className="mt-3 max-w-2xl font-serif text-[42px] leading-[1.02] text-white sm:text-[58px]">Good things should make you feel good.</h1></div>
      </section>
      <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <section className="grid gap-5 border-b border-[var(--line)] pb-10 sm:grid-cols-[0.7fr_1.3fr] sm:gap-12 sm:pb-14">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#A88417]">A little about us</p>
          <div><h2 className="font-serif text-[27px] leading-snug sm:text-[34px]">We care about your well being.</h2><p className="mt-4 text-[12px] leading-6 text-[var(--muted)] sm:text-[13px]">Sandiego Collections began with a simple thought: personal style and personal care belong in the same conversation. We bring together considered clothing, expressive jewelry, and everyday body care in one place, so finding something that feels right can be an easy part of your day.</p><p className="mt-4 text-[12px] leading-6 text-[var(--muted)] sm:text-[13px]">Rooted in Lagos and open to the world, our collection is shaped by curiosity, useful details, and the belief that small choices can make daily life feel more like your own.</p></div>
        </section>
        <section className="py-9 sm:py-12"><div className="flex items-end justify-between gap-4"><div><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#A88417]">What guides us</p><h2 className="mt-2 font-serif text-[27px] sm:text-[32px]">A considered collection</h2></div><Sparkles size={19} className="mb-1 text-[#A88417]" /></div><div className="mt-6 grid gap-px border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">{values.map(({ icon: Icon, title, text }) => <article key={title} className="bg-[var(--surface)] p-5 sm:p-6"><Icon size={19} strokeWidth={1.5} className="text-[#A88417]" /><h3 className="mt-5 font-serif text-[18px]">{title}</h3><p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">{text}</p></article>)}</div></section>
        <section className="flex flex-col gap-4 border-t border-[var(--line)] pt-7 sm:flex-row sm:items-center sm:justify-between"><p className="font-serif text-[21px]">Find the pieces that feel like you.</p><Link to="/store" className="inline-flex h-11 items-center justify-center gap-2 bg-[#D4AF37] px-5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#17150E] hover:bg-[#E5C75E]">Explore the collection <ArrowRight size={14} /></Link></section>
      </div>
    </div>
  )
}
