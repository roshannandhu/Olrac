import {
  ArrowRight,
  BadgeIndianRupee,
  Megaphone,
  MonitorPlay,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePublicSettings } from '../context/PublicSettingsContext'

const heroCards = [
  {
    icon: MonitorPlay,
    title: 'Digital In-Store Ads',
    desc: 'Real-world screen visibility in busy locations.',
  },
  {
    icon: BadgeIndianRupee,
    title: 'Affordable Start',
    desc: 'Advertising starts at just \u20b999 per day.',
  },
  {
    icon: Target,
    title: 'Repeated Exposure',
    desc: 'Your brand stays visible throughout the day.',
  },
]

const aboutSections = [
  {
    title: 'Our Motive',
    content:
      'Our motive is to make advertising accessible and beneficial for businesses of all sizes. We understand that not every business has a large marketing budget, but every business deserves visibility. OLRAC Advertise focuses on creating opportunities for local businesses, startups, and growing brands to advertise easily. We aim to simplify advertising so business owners can focus on running their operations while we help them gain exposure. By offering flexible and affordable advertising, we help businesses reach their target customers more effectively. Our ultimate goal is to support business growth through smart and practical advertising solutions.',
    icon: Megaphone,
    surface:
      'border-primary-100 bg-[linear-gradient(135deg,rgba(245,243,255,0.9)_0%,rgba(255,255,255,0.96)_100%)]',
    badge: 'bg-primary-50 text-primary-700',
    iconWrap: 'bg-primary-100 text-primary-700',
  },
  {
    title: 'What We Offer',
    content:
      'OLRAC Advertise provides digital in-store advertising through high-quality display screens placed in busy locations. These screens run advertisements throughout the day, ensuring repeated exposure for your business. Your advertisement is displayed in a slot-based format, which means your ad plays multiple times during the screen operating hours. This repeated visibility helps customers recognize and remember your brand. The screens operate for up to 15 hours daily, maximizing your brand exposure. This consistent presence helps businesses build awareness and attract potential customers.',
    icon: MonitorPlay,
    surface: 'border-slate-200 bg-white',
    badge: 'bg-slate-100 text-slate-700',
    iconWrap: 'bg-slate-100 text-slate-700',
  },
  {
    title: 'Cost-Effective Advertising',
    content:
      'Advertising should deliver results without being expensive, and that is exactly what OLRAC Advertise provides. Our pricing is designed to be affordable so even small businesses can promote their brand. Instead of spending large amounts on traditional advertising, businesses can get repeated exposure at a lower cost. This helps businesses increase visibility while managing their marketing budget effectively. Our cost-effective approach ensures businesses receive better value for their investment. With OLRAC Advertise, you get continuous brand exposure without heavy financial commitments.',
    icon: BadgeIndianRupee,
    surface:
      'border-primary-100 bg-[linear-gradient(135deg,rgba(255,255,255,1)_0%,rgba(248,250,252,1)_100%)]',
    badge: 'bg-primary-50 text-primary-700',
    iconWrap: 'bg-primary-100 text-primary-700',
  },
  {
    title: 'Flexible Advertising',
    content:
      "Flexibility is one of the biggest advantages of advertising with OLRAC Advertise. When you book a slot, that slot is fully dedicated to your business and your advertisement plays repeatedly throughout the day. You can change your advertisement content anytime \u2014 whether it's new offers, seasonal promotions, product launches, or business updates \u2014 and we do not charge any extra amount for changing the advertisement. Since you are booking your own slot, you have full control over what is displayed, allowing you to run multiple campaigns within your booked duration and keep your advertisement always fresh, relevant, and aligned with your business goals.",
    icon: Zap,
    surface: 'border-slate-200 bg-white',
    badge: 'bg-slate-100 text-slate-700',
    iconWrap: 'bg-slate-100 text-slate-700',
  },
  {
    title: 'Why Choose OLRAC Advertise',
    content:
      'OLRAC Advertise offers a simple and effective way to promote your business. Our advertising screens are placed in high-visibility locations where customers naturally spend time. This increases the chances of your advertisement being noticed and remembered. We provide flexible plans that suit businesses of all sizes and budgets. Our repeated advertisement display helps build brand awareness and customer trust.',
    extra:
      'Most importantly, our advertisement starts at just \u20b999 per day, making it one of the most affordable advertising solutions available. This allows even small businesses and startups to promote their brand without heavy investment. You get high visibility, repeated exposure, and flexible advertising at a very affordable price. Choosing OLRAC Advertise means choosing smart, affordable, and effective advertising.',
    icon: Target,
    surface:
      'border-primary-100 bg-[linear-gradient(135deg,rgba(245,243,255,0.94)_0%,rgba(239,246,255,0.9)_100%)]',
    badge: 'bg-primary-50 text-primary-700',
    iconWrap: 'bg-primary-100 text-primary-700',
  },
  {
    title: 'Our Vision',
    content:
      'Our vision is to create a strong digital advertising network that supports businesses in reaching their customers effectively. We aim to expand our advertising network across multiple locations to provide greater visibility. Our focus is to become a trusted advertising partner for businesses. We want to help brands grow by connecting them directly with customers. Through innovation and flexibility, we aim to improve advertising experiences for businesses. OLRAC Advertise strives to make advertising smarter, easier, and more accessible.',
    icon: Sparkles,
    surface: 'border-slate-200 bg-white',
    badge: 'bg-slate-100 text-slate-700',
    iconWrap: 'bg-slate-100 text-slate-700',
  },
]

export default function About() {
  const navigate = useNavigate()
  const { settings } = usePublicSettings()
  const appName = settings.config.general_app_name || 'OLRAC Advertise'

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f4ff_0%,#ffffff_24%,#f8fafc_100%)]">
      <section className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(135deg,#4c1d95_0%,#6d28d9_42%,#4338ca_100%)]">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute left-[-4%] top-10 h-72 w-72 rounded-full bg-white blur-3xl" />
          <div className="absolute right-[6%] top-16 h-80 w-80 rounded-full bg-fuchsia-300 blur-3xl" />
          <div className="absolute bottom-[-80px] left-[35%] h-72 w-72 rounded-full bg-cyan-300 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur-sm">
                <Megaphone className="h-4 w-4 text-yellow-300" />
                About {appName}
              </div>

              <h1 className="mt-6 text-4xl font-black leading-[1.02] text-white sm:text-5xl lg:text-6xl">
                About OLRAC Advertise
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-white/85 sm:text-lg">
                At OLRAC Advertise, we believe advertising should be simple, affordable, and effective for every business. Many businesses struggle with expensive marketing options that do not always guarantee results. Our goal is to provide a smarter advertising solution that delivers visibility without high costs. We help businesses reach customers through digital in-store advertising placed in high-traffic locations. This ensures your brand is seen repeatedly by potential customers throughout the day. With OLRAC Advertise, businesses can promote their services confidently and grow their customer base effectively.
              </p>

              <button
                onClick={() => navigate('/locations')}
                className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-primary-700 shadow-xl transition duration-300 hover:-translate-y-0.5 hover:bg-slate-50"
              >
                View Locations
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <div className="rounded-[34px] border border-white/15 bg-white/10 p-4 shadow-[0_28px_80px_rgba(15,23,42,0.24)] backdrop-blur-xl">
                <div className="grid gap-4 sm:grid-cols-2">
                  {heroCards.map((item, index) => (
                    <article
                      key={item.title}
                      className={`rounded-[28px] border border-white/15 bg-white/10 p-5 text-white backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:bg-white/15 ${
                        index === 0 ? 'sm:col-span-2' : ''
                      }`}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <h2 className="mt-5 text-lg font-bold text-white">{item.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-white/75">{item.desc}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="space-y-7 lg:space-y-8">
          {aboutSections.map((section) => (
            <article
              key={section.title}
              className={`overflow-hidden rounded-[34px] border shadow-[0_18px_48px_rgba(15,23,42,0.05)] ${section.surface}`}
            >
              <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)] lg:gap-10 lg:p-10">
                <div className="flex flex-col justify-start">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${section.iconWrap}`}>
                    <section.icon className="h-6 w-6" />
                  </div>

                  <div className={`mt-5 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${section.badge}`}>
                    <Zap className="h-3.5 w-3.5" />
                    OLRAC Advertise
                  </div>

                  <h2 className="mt-5 font-['Sora',sans-serif] text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                    {section.title}
                  </h2>
                </div>

                <div className="space-y-5">
                  <div className="rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm sm:p-7">
                    <p className="text-base leading-8 text-slate-700">{section.content}</p>
                  </div>

                  {section.extra ? (
                    <div className="rounded-[28px] border border-primary-100 bg-primary-50/80 p-6 shadow-sm sm:p-7">
                      <p className="text-base leading-8 text-slate-700">{section.extra}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="pb-16 pt-2 sm:pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(76,29,149,0.12)]">
            <div className="grid lg:grid-cols-[0.92fr_1.08fr]">
              <div className="bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_100%)] px-8 py-10 text-white sm:px-10 sm:py-12">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
                  <Target className="h-3.5 w-3.5" />
                  Start Advertising With OLRAC
                </div>
                <h2 className="mt-5 font-['Sora',sans-serif] text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Start Advertising With OLRAC
                </h2>
              </div>

              <div className="px-8 py-10 sm:px-10 sm:py-12">
                <div className="max-w-3xl">
                  <p className="text-base leading-8 text-slate-700">
                    Whether you are a small business, startup, or growing brand, OLRAC Advertise helps you reach your audience effectively. Our advertising solutions are designed to be simple and beneficial for everyone. With repeated exposure and flexible options, businesses can promote their services confidently. We make advertising easy so you can focus on growing your business. Start promoting your brand today with OLRAC Advertise. Let your business get the visibility it deserves.
                  </p>
                  <p className="mt-5 text-lg font-semibold text-slate-900">
                    OLRAC Advertise \u2014 Smart Advertising Made Simple
                  </p>
                  <button
                    onClick={() => navigate('/locations')}
                    className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg transition duration-300 hover:-translate-y-0.5 hover:bg-primary-700"
                  >
                    View Locations
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
