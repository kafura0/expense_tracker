'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

function InsightsIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  )
}

function CalculatorIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
    </svg>
  )
}

function CurrencyIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function SyncIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
    </svg>
  )
}

const FEATURES = [
  {
    iconComponent: InsightsIcon,
    title: 'Smart Insights',
    description: 'AI-driven patterns that detect anomalies and spending trends before they impact your runway.',
    span: 'md:col-span-7',
    hasVisual: true,
  },
  {
    iconComponent: CalculatorIcon,
    title: 'VAT Calculations',
    description: 'Automatic tax extraction and VAT compliance across 120+ jurisdictions.',
    span: 'md:col-span-5',
    hasCalc: true,
  },
  {
    iconComponent: CurrencyIcon,
    title: 'Multi-currency',
    description: 'Real-time spot rates with historical data syncing for seamless cross-border reporting.',
    span: 'md:col-span-5',
  },
  {
    iconComponent: SyncIcon,
    title: 'Global Bank Sync',
    description: 'Connect to 15,000+ financial institutions via Plaid, Salt Edge, and direct API endpoints.',
    span: 'md:col-span-7',
    hasBanks: true,
  },
]

const TESTIMONIALS = [
  {
    quote: 'Ledgerly is the first tool that actually speaks the language of a CFO. The multi-currency handling is lightyears ahead of anything else.',
    name: 'Marcus Chen',
    role: 'Founder at Vertex',
    color: 'bg-primary-container',
  },
  {
    quote: "Finally, a dashboard that doesn't hide data behind layers of menus. It's fast, beautiful, and hyper-precise.",
    name: 'Sarah Drasner',
    role: 'CTO at Aether',
    color: 'bg-secondary-container',
  },
]

const PRICING_PLANS = [
  {
    name: 'Starter',
    price: '$0',
    period: '/mo',
    features: ['Up to 50 entries', 'Manual CSV export', 'Basic Insights'],
    cta: 'Start for free',
    featured: false,
  },
  {
    name: 'Professional',
    price: '$24',
    period: '/mo',
    features: ['Unlimited entries', 'Auto Bank Sync', 'Smart VAT Extraction', 'PDF Invoicing'],
    cta: 'Go Professional',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: ['Custom API endpoints', 'Role-based access', 'Dedicated Auditor'],
    cta: 'Contact Sales',
    featured: false,
  },
]

export default function LandingPage() {
  const [currentYear] = useState(new Date().getFullYear())

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section')
      const navLinks = document.querySelectorAll('header nav a')
      let current = ''
      sections.forEach((section) => {
        if (window.scrollY >= section.offsetTop - 100) {
          current = section.getAttribute('id') || ''
        }
      })
      navLinks.forEach((link) => {
        const href = link.getAttribute('href') || ''
        if (href === `#${current}`) {
          link.classList.add('text-primary', 'font-bold')
          link.classList.remove('text-on-surface-variant')
        } else {
          link.classList.remove('text-primary', 'font-bold')
          link.classList.add('text-on-surface-variant')
        }
      })
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="bg-background text-on-surface antialiased selection:bg-primary/30 selection:text-primary-fixed">
      {/* ─── Top Nav ─── */}
      <header className="flex justify-between items-center w-full px-md md:px-xl h-16 sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-outline-variant">
        <div className="flex items-center gap-lg md:gap-xl">
          <Link href="/" className="font-headline text-headline-md font-bold text-on-surface tracking-tight">
            Ledgerly
          </Link>
          <nav className="hidden md:flex gap-lg items-center">
            <a href="#" className="text-primary font-bold border-b-2 border-primary pb-1 font-label-sm text-label-sm">
              Home
            </a>
            <a href="#features" className="text-on-surface-variant hover:bg-surface-variant transition-colors duration-150 px-3 py-1 rounded font-label-sm text-label-sm">
              Features
            </a>
            <a href="#pricing" className="text-on-surface-variant hover:bg-surface-variant transition-colors duration-150 px-3 py-1 rounded font-label-sm text-label-sm">
              Pricing
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-md">
          <Link href="/login" className="text-on-surface-variant hover:text-primary transition-colors font-medium text-body-md">
            Sign In
          </Link>
          <Link href="/signup" className="bg-primary-container text-on-primary-container font-body-md text-body-md px-md py-xs rounded-lg font-medium hover:scale-[0.98] transition-all">
            Get Started
          </Link>
        </div>
      </header>

      <main className="relative overflow-hidden pb-20 md:pb-0">
        {/* ─── Hero ─── */}
        <section className="hero-gradient pt-24 pb-12 px-md md:px-xl">
          <div className="max-w-container-max mx-auto text-center">
            <div className="inline-flex items-center gap-sm px-3 py-1 rounded-full border border-outline-variant bg-surface-container-low mb-lg">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest">
                Now supporting 40+ Currencies
              </span>
            </div>

            <h1 className="font-headline text-display-lg md:text-6xl mb-md max-w-4xl mx-auto leading-tight">
              Intelligence for your{' '}
              <span className="text-primary">personal capital.</span>
            </h1>

            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-xl">
              Ledgerly transforms chaotic financial data into precise strategic
              assets. Automated reconciliation, multi-currency mastery, and
              bank-grade security.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-md mb-2xl">
              <Link
                href="/signup"
                className="bg-primary text-on-primary font-medium px-xl py-md rounded-xl text-body-lg hover:brightness-110 transition-all emerald-drop"
              >
                Start Auditing Free
              </Link>
              <Link
                href="#features"
                className="border border-outline-variant text-on-surface font-medium px-xl py-md rounded-xl text-body-lg hover:bg-surface-variant transition-all"
              >
                See Features
              </Link>
            </div>

            {/* Dashboard Preview */}
            <div className="relative w-full max-w-5xl mx-auto mt-xl px-2 md:px-0">
              <div className="absolute inset-0 bg-primary/10 blur-[120px] rounded-full -z-10 translate-y-20" />
              <div className="glass-card rounded-2xl p-xs md:p-sm shadow-2xl overflow-hidden border border-outline-variant/30">
                <div className="bg-surface-dim rounded-xl border border-outline-variant/20 overflow-hidden shadow-inner">
                  <div className="h-8 bg-surface-container-low border-b border-outline-variant/20 flex items-center px-md gap-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-error-container" />
                    <div className="w-2.5 h-2.5 rounded-full bg-tertiary-container" />
                    <div className="w-2.5 h-2.5 rounded-full bg-primary-container" />
                  </div>
                  <div className="p-lg md:p-2xl">
                    <div className="w-full aspect-[16/9] bg-surface-container-high rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 text-primary/40 mx-auto mb-md">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
                        </svg>
                        <p className="text-on-surface-variant font-body-md text-body-md">
                          Your expense dashboard
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Features ─── */}
        <section className="py-xl md:py-2xl px-md md:px-xl" id="features">
          <div className="max-w-container-max mx-auto">
            <div className="text-center mb-2xl">
              <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-md">
                Features
              </p>
              <h2 className="font-headline text-headline-lg mb-sm">
                Engineered for Precision
              </h2>
              <p className="text-on-surface-variant font-body-md text-body-md">
                Tools built for the modern financial operator.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-md md:gap-lg h-auto">
              {FEATURES.map((feature) => {
                const IconComp = feature.iconComponent
                return (
                  <div
                    key={feature.title}
                    className={`${feature.span} glass-card p-lg md:p-xl rounded-2xl border border-outline-variant/20 flex flex-col justify-between group hover:border-primary/50 transition-all duration-300`}
                  >
                    <div>
                      <div className="w-12 h-12 bg-primary-container/20 rounded-lg flex items-center justify-center mb-lg">
                        <IconComp className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-headline text-headline-md mb-md">{feature.title}</h3>
                      <p className="text-on-surface-variant font-body-md text-body-md max-w-sm">
                        {feature.description}
                      </p>
                    </div>

                    {feature.hasVisual && (
                      <div className="mt-xl h-48 bg-surface-container-high rounded-xl overflow-hidden relative border border-outline-variant/10 flex items-end justify-center gap-xs px-md pb-lg pt-md">
                        {[14, 24, 10, 30, 7, 22, 16, 28, 11, 20, 13, 26, 9, 18].map((h, i) => (
                          <div
                            key={i}
                            className="w-3 rounded-full bg-primary/60 group-hover:bg-primary transition-colors duration-500"
                            style={{ height: `${h * 0.12}rem` }}
                          />
                        ))}
                      </div>
                    )}

                    {feature.hasCalc && (
                      <div className="mt-xl bg-surface-container rounded-lg p-md font-mono text-xs border border-outline-variant/20">
                        <div className="flex justify-between text-on-surface-variant border-b border-outline-variant/10 pb-xs mb-xs">
                          <span className="uppercase tracking-wider text-[10px]">Net Amount</span>
                          <span className="text-on-surface">$1,240.00</span>
                        </div>
                        <div className="flex justify-between text-on-surface-variant border-b border-outline-variant/10 pb-xs mb-xs">
                          <span className="uppercase tracking-wider text-[10px]">VAT (21%)</span>
                          <span className="text-primary">+$260.40</span>
                        </div>
                        <div className="flex justify-between font-bold text-on-surface text-[13px]">
                          <span className="uppercase tracking-wider text-[10px]">Total Audited</span>
                          <span>$1,500.40</span>
                        </div>
                      </div>
                    )}

                    {feature.hasBanks && (
                      <div className="mt-xl flex justify-center items-center">
                        <div className="grid grid-cols-3 gap-md">
                          <div className="w-16 h-16 bg-surface-container rounded-lg border border-outline-variant/20 flex items-center justify-center grayscale hover:grayscale-0 transition-all cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-on-surface/10" />
                          </div>
                          <div className="w-16 h-16 bg-surface-container rounded-lg border border-outline-variant/20 flex items-center justify-center grayscale hover:grayscale-0 transition-all cursor-pointer">
                            <div className="w-8 h-8 bg-on-surface/10 rotate-45" />
                          </div>
                          <div className="w-16 h-16 bg-surface-container rounded-lg border border-outline-variant/20 flex items-center justify-center grayscale hover:grayscale-0 transition-all cursor-pointer">
                            <div className="w-8 h-4 bg-on-surface/10 rounded-full" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ─── Social Proof ─── */}
        <section className="py-xl md:py-2xl bg-surface-container-lowest overflow-hidden border-y border-outline-variant/20">
          <div className="max-w-container-max mx-auto px-md md:px-xl">
            <p className="font-label-sm text-label-sm text-center text-outline uppercase tracking-widest mb-2xl">
              Trusted by leaders at
            </p>
            <div className="flex flex-wrap justify-center items-center gap-lg md:gap-2xl opacity-50 contrast-125 grayscale">
              {['VERTEX', 'LINEAR', 'VULCAN', 'AETHER', 'SYNERGY'].map((name) => (
                <span key={name} className="font-headline text-headline-md font-bold">
                  {name}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-xl mt-2xl">
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.name}
                  className="p-xl rounded-2xl bg-surface-dim border border-outline-variant/10 italic"
                >
                  <p className="font-body-lg text-body-lg text-on-surface mb-lg">
                    &quot;{t.quote}&quot;
                  </p>
                  <div className="flex items-center gap-md not-italic">
                    <div className={`w-10 h-10 rounded-full ${t.color}`} />
                    <div>
                      <p className="font-bold text-on-surface">{t.name}</p>
                      <p className="text-sm text-outline">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Pricing ─── */}
        <section className="py-xl md:py-2xl px-md md:px-xl" id="pricing">
          <div className="max-w-container-max mx-auto">
            <div className="text-center mb-2xl">
              <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-md">
                Pricing
              </p>
              <h2 className="font-headline text-headline-lg mb-sm">
                Transparent Scaling
              </h2>
              <p className="text-on-surface-variant font-body-md text-body-md">
                Choose the workspace that fits your volume.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg md:gap-xl">
              {PRICING_PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`p-lg md:p-xl rounded-2xl flex flex-col transition-all duration-300 ${
                    plan.featured
                      ? 'border-2 border-primary bg-surface-container-high relative shadow-[0_0_40px_rgba(78,222,163,0.1)]'
                      : 'border border-outline-variant/20 bg-surface-container hover:border-outline transition-all'
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-on-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                      Most Popular
                    </div>
                  )}
                  <span className="font-label-sm text-label-sm uppercase mb-md text-outline">
                    {plan.name}
                  </span>
                  <div className="flex items-end gap-xs mb-lg">
                    <span className="font-headline text-headline-lg">{plan.price}</span>
                    {plan.period && (
                      <span className="text-on-surface-variant mb-xs">{plan.period}</span>
                    )}
                  </div>
                  <ul className="space-y-md mb-2xl flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-sm text-body-md">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-primary shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.featured ? '/signup' : '#'}
                    className={`w-full py-md rounded-xl font-medium transition-all text-center block ${
                      plan.featured
                        ? 'bg-primary text-on-primary hover:brightness-110'
                        : 'border border-outline-variant text-on-surface hover:bg-surface-variant'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-xl md:py-2xl px-md md:px-xl relative">
          <div className="max-w-container-max mx-auto glass-card rounded-3xl p-lg md:p-2xl text-center border border-primary/20 overflow-hidden">
            <h2 className="font-headline text-headline-lg md:text-display-lg mb-md">
              Ready to audit?
            </h2>
            <p className="text-on-surface-variant font-body-lg text-body-lg mb-xl max-w-xl mx-auto">
              Join 12,000+ operators managing their capital with absolute clarity.
            </p>
            <Link
              href="/signup"
              className="bg-primary text-on-primary font-medium px-xl md:px-2xl py-md rounded-xl text-body-lg hover:brightness-110 transition-all emerald-drop inline-block"
            >
              Deploy Ledgerly
            </Link>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="bg-surface-container-lowest border-t border-outline-variant/20 pt-2xl pb-xl px-md md:px-xl">
        <div className="max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-12 gap-xl mb-2xl">
          <div className="md:col-span-4">
            <span className="font-headline text-headline-md font-bold text-on-surface block mb-md">
              Ledgerly
            </span>
            <p className="text-on-surface-variant font-body-md text-body-md mb-xl max-w-xs">
              The premium operating system for high-net-worth capital management.
            </p>
            <div className="flex gap-md">
              <a href="#" className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-on-surface-variant">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-on-surface-variant">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                </svg>
              </a>
            </div>
          </div>
          <div className="md:col-span-2">
            <h4 className="font-label-sm text-label-sm text-on-surface uppercase mb-lg">
              Product
            </h4>
            <ul className="space-y-sm text-on-surface-variant font-body-md">
              <li><a href="#" className="hover:text-primary transition-colors">Changelog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Integrations</a></li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <h4 className="font-label-sm text-label-sm text-on-surface uppercase mb-lg">
              Company
            </h4>
            <ul className="space-y-sm text-on-surface-variant font-body-md">
              <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Legal</a></li>
            </ul>
          </div>
          <div className="md:col-span-4">
            <h4 className="font-label-sm text-label-sm text-on-surface uppercase mb-lg">
              Subscribe to Updates
            </h4>
            <div className="flex gap-sm">
              <input
                type="email"
                placeholder="email@example.com"
                className="bg-surface-dim border border-outline-variant rounded-lg px-md py-xs flex-1 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
              <button className="bg-on-surface text-surface py-xs px-md rounded-lg font-medium hover:opacity-90 transition-all">
                Join
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-center border-t border-outline-variant/10 pt-xl">
          <p className="text-outline font-label-sm text-label-sm">
            &copy; {currentYear} Ledgerly Inc. All rights reserved.
          </p>
          <div className="flex gap-xl mt-md md:mt-0">
            <a href="#" className="text-outline font-label-sm text-label-sm hover:text-on-surface">Security</a>
            <a href="#" className="text-outline font-label-sm text-label-sm hover:text-on-surface">Privacy Policy</a>
            <a href="#" className="text-outline font-label-sm text-label-sm hover:text-on-surface">Terms</a>
          </div>
        </div>
      </footer>

      {/* ─── Mobile Bottom Nav ─── */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-md pb-safe pt-sm md:hidden bg-surface-container/90 backdrop-blur-lg border-t border-outline-variant">
        <a href="#" className="flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-xl px-4 py-1 scale-90 transition-all duration-150">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <span className="font-label-sm text-label-sm">Home</span>
        </a>
        <a href="#features" className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 active:bg-surface-variant transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <span className="font-label-sm text-label-sm">Features</span>
        </a>
        <a href="#pricing" className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 active:bg-surface-variant transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
          <span className="font-label-sm text-label-sm">Pricing</span>
        </a>
        <a href="/login" className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 active:bg-surface-variant transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          <span className="font-label-sm text-label-sm">Settings</span>
        </a>
      </nav>
    </div>
  )
}
