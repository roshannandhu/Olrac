import { useEffect, useRef, useState } from 'react'
import {
  BadgeIndianRupee,
  Clock,
  MapPin,
  Megaphone,
  MonitorPlay,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
  ArrowRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePublicSettings } from '../context/PublicSettingsContext'
import { motion, useInView } from 'framer-motion'
import { pageTransition } from '../utils/animations'

function Counter({ to, prefix = '', suffix = '', duration = 1.8 }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  useEffect(() => {
    if (!inView) return
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / (duration * 1000), 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setVal(Math.round(ease * to))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [inView, to, duration])

  return <span ref={ref}>{prefix}{val.toLocaleString('en-IN')}{suffix}</span>
}

const heroStats = [
  { icon: BadgeIndianRupee, num: '₹99/day', label: 'Starting Price', bg: 'bg-blue-600' },
  { icon: Clock, num: '15 hrs', label: 'Daily Uptime', bg: 'bg-emerald-500' },
  { icon: Zap, num: '₹0', label: 'Change Fees', bg: 'bg-violet-500' },
]

const aboutSections = [
  {
    title: 'Our Motive',
    content: 'Our motive is to make advertising accessible and beneficial for businesses of all sizes. We understand that not every business has a large marketing budget, but every business deserves visibility. OLRAC Advertise focuses on creating opportunities for local businesses, startups, and growing brands to advertise easily.',
    icon: Megaphone,
    tag: 'Mission',
    color: '#1d4ed8',
    metric: null,
  },
  {
    title: 'What We Offer',
    content: 'OLRAC Advertise provides digital in-store advertising through high-quality display screens placed in busy locations. These screens run advertisements throughout the day, ensuring repeated exposure for your business.',
    icon: MonitorPlay,
    tag: 'Product',
    color: '#2563eb',
    metric: { value: '15 hrs/day', label: 'Screen uptime' },
  },
  {
    title: 'Cost-Effective Advertising',
    content: 'Advertising should deliver results without being expensive, and that is exactly what OLRAC Advertise provides. Our pricing is designed to be affordable so even small businesses can promote their brand with continuous exposure without heavy financial commitments.',
    icon: BadgeIndianRupee,
    tag: 'Pricing',
    color: '#059669',
    metric: { value: '₹99/day', label: 'Starting price' },
  },
  {
    title: 'Flexible Advertising',
    content: "Flexibility is one of the biggest advantages of advertising with OLRAC Advertise. You can change your advertisement content anytime — whether it's new offers, seasonal promotions, product launches, or business updates — and we do not charge any extra amount for changing the advertisement.",
    icon: Zap,
    tag: 'Flexibility',
    color: '#d97706',
    metric: { value: '₹0', label: 'Change fees' },
  },
  {
    title: 'Why Choose OLRAC',
    content: 'OLRAC Advertise offers a simple and effective way to promote your business. Our advertising screens are placed in high-visibility locations where customers naturally spend time. Most importantly, our advertisement starts at just ₹99 per day, making it one of the most affordable advertising solutions available.',
    icon: Target,
    tag: 'Advantage',
    color: '#1d4ed8',
    metric: null,
  },
  {
    title: 'Our Vision',
    content: 'Our vision is to create a strong digital advertising network that supports businesses in reaching their customers effectively. We aim to expand our advertising network across multiple locations. Through innovation and flexibility, we aim to improve advertising experiences for businesses.',
    icon: Sparkles,
    tag: 'Vision',
    color: '#475569',
    metric: null,
  },
]

export default function About() {
  const navigate = useNavigate()
  const { settings } = usePublicSettings()
  const appName = settings.config.general_app_name || 'OLRAC Advertise'

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-white"
    >

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="bg-white pt-14 pb-12 sm:pt-20 sm:pb-16 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 lg:gap-16">

            {/* Left: text */}
            <div className="max-w-2xl">
              <motion.span
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-600 mb-6"
              >
                <Megaphone className="h-3 w-3" />
                About Us
              </motion.span>

              <div className="overflow-hidden">
                <motion.h1
                  initial={{ y: 56, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.75, ease: [0, 0, 0.2, 1], delay: 0.1 }}
                  className="text-5xl font-black leading-[0.93] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl xl:text-[5rem]"
                >
                  About<br />
                  <span className="text-blue-600">OLRAC</span><br />
                  Advertise
                </motion.h1>
              </div>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.36 }}
                className="mt-6 text-base sm:text-lg leading-[1.8] text-slate-500 max-w-lg"
              >
                We believe advertising should be simple, affordable, and effective for every business.
                Reach customers through digital in-store screens in high-traffic locations.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.52 }}
                className="mt-8 flex flex-wrap gap-3"
              >
                <button
                  onClick={() => navigate('/booking')}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-7 py-3 text-sm font-black text-white hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                >
                  <Sparkles className="h-4 w-4" />
                  Instant Quotation
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate('/locations')}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <MapPin className="h-4 w-4" />
                  View Locations
                </button>
              </motion.div>
            </div>

            {/* Right: stat cards — desktop only */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="hidden lg:flex flex-col gap-3 w-[260px] flex-shrink-0"
            >
              {heroStats.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
                    <s.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-900 leading-tight">{s.num}</p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{s.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>

          </div>

          {/* Mobile stat row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-8 grid grid-cols-3 gap-3 lg:hidden"
          >
            {heroStats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                <div className={`mx-auto mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl ${s.bg}`}>
                  <s.icon className="h-4 w-4 text-white" />
                </div>
                <p className="text-lg font-black text-slate-900 leading-tight">{s.num}</p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── ABOUT CARDS ──────────────────────────────────────── */}
      <section className="bg-slate-50 py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="mb-10 lg:mb-14"
          >
            <span className="inline-block rounded-full bg-blue-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-600 mb-3">
              What We Do
            </span>
            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl leading-tight">
              Everything You Need to Know
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {aboutSections.map((section, idx) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.5, delay: idx * 0.07 }}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: section.color + '18' }}
                >
                  <section.icon className="h-5 w-5" style={{ color: section.color }} />
                </div>
                <div className="mb-3 inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em]"
                  style={{ borderColor: section.color + '30', color: section.color, backgroundColor: section.color + '08' }}
                >
                  {section.tag}
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2.5">{section.title}</h3>
                <p className="text-sm leading-[1.8] text-slate-500">{section.content}</p>
                {section.metric && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2">
                    <span className="text-base font-black text-slate-900">{section.metric.value}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{section.metric.label}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="bg-blue-600 py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <span className="inline-block rounded-full bg-white/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-100 mb-5">
              Get Started
            </span>
            <h2 className="text-3xl font-black text-white sm:text-4xl leading-tight">
              Start Advertising With OLRAC
            </h2>
            <p className="mt-4 text-base leading-[1.8] text-blue-100 max-w-xl mx-auto">
              Premium screen advertising starting at just ₹99/day.
              Whether you are a small business, startup, or growing brand, OLRAC Advertise helps you reach
              your audience effectively. Start promoting your brand today.
            </p>
            <p className="mt-3 text-sm font-semibold text-blue-200">
              OLRAC Advertise — Smart Advertising Made Simple
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/booking')}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-black text-blue-600 hover:bg-blue-50 transition-colors shadow-lg"
              >
                <Sparkles className="h-4 w-4" />
                Instant Quotation
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate('/locations')}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border-2 border-white/30 px-8 py-3.5 text-sm font-bold text-white hover:border-white/60 transition-colors"
              >
                <MapPin className="h-4 w-4" />
                View Locations
              </button>
            </div>
          </motion.div>
        </div>
      </section>

    </motion.div>
  )
}
