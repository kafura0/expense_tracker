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

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-primary shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
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
    quote:
      '"Ledgerly is the first tool that actually speaks the language of a CFO. The multi-currency handling is lightyears ahead of anything else."',
    name: 'Marcus Chen',
    role: 'Founder at Vertex',
    color: 'bg-primary-container',
  },
  {
    quote:
      '"Finally, a dashboard that doesn\'t hide data behind layers of menus. It\'s fast, beautiful, and hyper-precise."',
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
      {/* Header */}
      <header className="flex justify-between items-center w-full px-6 md:px-12 h-16 sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-outline-variant/30">
        <div className="flex items-center gap-10">
          <Link href="/" className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight">
            Ledgerly
          </Link>
          <nav className="hidden md:flex gap-8 items-center">
            <a href="#" className="text-primary font-bold border-b-2 border-primary pb-1 font-label-sm text-label-sm">
              Home
            </a>
            <a href="#features" className="text-on-surface-variant hover:text-on-surface transition-colors duration-150 font-label-sm text-label-sm">
              Features
            </a>
            <a href="#pricing" className="text-on-surface-variant hover:text-on-surface transition-colors duration-150 font-label-sm text-label-sm">
              Pricing
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/login" className="text-on-surface-variant hover:text-primary transition-colors font-medium text-sm">
            Sign In
          </Link>
          <Link href="/signup" className="bg-primary-container text-on-primary-container text-sm px-5 py-2 rounded-lg font-medium hover:scale-[0.98] transition-all">
            Get Started
          </Link>
        </div>
      </header>

      <main className="relative overflow-hidden">
        {/* ─── Hero Section ─── */}
        <section className="hero-gradient pt-28 pb-20 md:pt-36 md:pb-28 px-6 md:px-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-outline-variant/40 bg-surface-container-low/60 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="font-label-sm text-xs text-primary uppercase tracking-widest font-medium">
                Now supporting 40+ Currencies
              </span>
            </div>

            <h1 className="font-headline text-5xl md:text-[64px] font-bold mb-6 leading-[1.08] tracking-tight">
              Intelligence for your{' '}
              <span className="text-primary">personal capital.</span>
            </h1>

            <p className="text-lg md:text-xl text-on-surface-variant/80 max-w-[540px] mx-auto mb-10 leading-relaxed">
              Ledgerly transforms chaotic financial data into precise strategic
              assets. Automated reconciliation, multi-currency mastery, and
              bank-grade security.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-20">
              <Link
                href="/signup"
                className="bg-primary text-on-primary font-semibold px-8 py-3.5 rounded-xl text-base hover:brightness-110 transition-all emerald-drop"
              >
                Start Auditing Free
              </Link>
              <Link
                href="#features"
                className="border border-outline-variant/50 text-on-surface font-medium px-8 py-3.5 rounded-xl text-base hover:bg-surface-variant/50 transition-all"
              >
                See Features
              </Link>
            </div>

            {/* Dashboard Preview */}
            <div className="relative max-w-4xl mx-auto">
              <div className="absolute inset-0 bg-primary/8 blur-[140px] rounded-full -z-10 translate-y-10" />
              <div className="glass-card rounded-2xl p-1 md:p-1.5 shadow-2xl overflow-hidden border border-outline-variant/20">
                <div className="bg-surface-dim rounded-xl border border-outline-variant/10 overflow-hidden shadow-inner">
                  <div className="h-9 bg-surface-container-low border-b border-outline-variant/15 flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-error-container/80" />
                    <div className="w-3 h-3 rounded-full bg-tertiary-container/80" />
                    <div className="w-3 h-3 rounded-full bg-primary-container/80" />
                  </div>
                  <div className="p-6 md:p-10">
                    <div className="w-full aspect-[16/9] bg-surface-container-high rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 text-primary/40 mx-auto mb-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
                        </svg>
                        <p className="text-on-surface-variant/50 font-body-md text-sm">
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

        {/* ─── Feature Bento Grid ─── */}
        <section className="py-24 md:py-32 px-6 md:px-12" id="features">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16 md:mb-20">
              <p className="font-label-sm text-xs text-primary uppercase tracking-widest font-medium mb-4">
                Features
              </p>
              <h2 className="font-headline text-3xl md:text-4xl font-bold mb-4 tracking-tight">
                Engineered for Precision
              </h2>
              <p className="text-on-surface-variant/70 text-base max-w-md mx-auto leading-relaxed">
                Tools built for the modern financial operator.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {FEATURES.map((feature) => {
                const IconComp = feature.iconComponent
                return (
                  <div
                    key={feature.title}
                    className={`${feature.span} glass-card p-8 rounded-2xl border border-outline-variant/15 flex flex-col justify-between group hover:border-primary/40 transition-all duration-300`}
                  >
                    <div>
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                        <IconComp className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-headline text-xl font-semibold mb-3 tracking-tight">
                        {feature.title}
                      </h3>
                      <p className="text-on-surface-variant/70 text-[15px] leading-[1.65]">
                        {feature.description}
                      </p>
                    </div>

                    {feature.hasVisual && (
                      <div className="mt-8 h-44 bg-surface-container-high rounded-xl overflow-hidden relative border border-outline-variant/10 flex items-end justify-center pb-6">
                        <div className="flex items-end gap-2">
                          {[16, 28, 12, 22, 8, 32, 18, 26, 14, 20, 10, 24].map((h, i) => (
                            <div
                              key={i}
                              className="w-2.5 rounded-full bg-primary/60 group-hover:bg-primary transition-colors duration-300"
                              style={{ height: `${h * 0.15}rem` }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {feature.hasCalc && (
                      <div className="bg-surface-container/80 rounded-xl p-5 font-mono text-xs border border-outline-variant/15 mt-8">
                        <div className="flex justify-between text-on-surface-variant/60 border-b border-outline-variant/10 pb-2.5 mb-2.5">
                          <span className="uppercase tracking-wider">Net Amount</span>
                          <span className="text-on-surface">$1,240.00</span>
                        </div>
                        <div className="flex justify-between text-on-surface-variant/60 border-b border-outline-variant/10 pb-2.5 mb-2.5">
                          <span className="uppercase tracking-wider">VAT (21%)</span>
                          <span className="text-primary">+$260.40</span>
                        </div>
                        <div className="flex justify-between font-bold text-on-surface">
                          <span className="uppercase tracking-wider">Total Audited</span>
                          <span>$1,500.40</span>
                        </div>
                      </div>
                    )}

                    {feature.hasBanks && (
                      <div className="mt-8 flex justify-center">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="w-16 h-16 bg-surface-container rounded-xl border border-outline-variant/15 flex items-center justify-center grayscale group-hover:grayscale-0 transition-all cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-on-surface/8" />
                          </div>
                          <div className="w-16 h-16 bg-surface-container rounded-xl border border-outline-variant/15 flex items-center justify-center grayscale group-hover:grayscale-0 transition-all cursor-pointer">
                            <div className="w-8 h-8 bg-on-surface/8 rotate-45" />
                          </div>
                          <div className="w-16 h-16 bg-surface-container rounded-xl border border-outline-variant/15 flex items-center justify-center grayscale group-hover:grayscale-0 transition-all cursor-pointer">
                            <div className="w-8 h-4 bg-on-surface/8 rounded-full" />
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
        <section className="py-24 md:py-28 bg-surface-container-lowest/50 overflow-hidden border-y border-outline-variant/15">
          <div className="max-w-4xl mx-auto px-6 md:px-12">
            <p className="font-label-sm text-xs text-center text-outline/60 uppercase tracking-[0.2em] mb-14">
              Trusted by leaders at
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-14 gap-y-6 opacity-30">
              {['VERTEX', 'LINEAR', 'VULCAN', 'AETHER', 'SYNERGY'].map((name) => (
                <span key={name} className="font-headline text-xl md:text-2xl font-bold tracking-tight">
                  {name}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.name}
                  className="p-8 rounded-2xl bg-surface-dim border border-outline-variant/10"
                >
                  <p className="text-[15px] text-on-surface/90 mb-6 leading-[1.7]">
                    {t.quote}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${t.color}`} />
                    <div>
                      <p className="font-semibold text-on-surface text-sm">{t.name}</p>
                      <p className="text-xs text-outline/60">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Pricing Section ─── */}
        <section className="py-24 md:py-32 px-6 md:px-12" id="pricing">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 md:mb-20">
              <p className="font-label-sm text-xs text-primary uppercase tracking-widest font-medium mb-4">
                Pricing
              </p>
              <h2 className="font-headline text-3xl md:text-4xl font-bold mb-4 tracking-tight">
                Transparent Scaling
              </h2>
              <p className="text-on-surface-variant/70 text-lg max-w-xl mx-auto">
                Choose the workspace that fits your volume.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {PRICING_PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-2xl flex flex-col transition-all duration-300 ${
                    plan.featured
                      ? 'border-2 border-primary bg-surface-container-high/80 relative shadow-[0_0_60px_rgba(78,222,163,0.08)] md:-mt-3 md:mb-[-12px]'
                      : 'border border-outline-variant/15 bg-surface-container/60 hover:border-outline-variant/40'
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute top-0 right-6 -translate-y-1/2 bg-primary text-on-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                      Most Popular
                    </div>
                  )}
                  <div className="p-8">
                    <span className={`font-label-sm text-xs uppercase tracking-widest font-medium ${
                      plan.featured ? 'text-primary' : 'text-outline/60'
                    }`}>
                      {plan.name}
                    </span>
                    <div className="flex items-end gap-1 mt-4 mb-6">
                      <span className="font-headline text-4xl font-bold">{plan.price}</span>
                      {plan.period && (
                        <span className="text-on-surface-variant/50 text-sm mb-1">{plan.period}</span>
                      )}
                    </div>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-3 text-sm text-on-surface/80">
                          <CheckIcon />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="px-8 pb-8">
                    <Link
                      href={plan.featured ? '/signup' : '#'}
                      className={`w-full py-3 rounded-xl font-semibold text-sm transition-all text-center block ${
                        plan.featured
                          ? 'bg-primary text-on-primary hover:brightness-110'
                          : 'border border-outline-variant/30 text-on-surface hover:bg-surface-variant/30'
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Final CTA ─── */}
        <section className="pb-24 md:pb-32 px-6 md:px-12 relative">
          <div className="max-w-4xl mx-auto glass-card rounded-3xl px-8 py-16 md:px-16 md:py-20 text-center border border-primary/15 overflow-hidden relative">
            <div className="absolute inset-0 bg-primary/5 blur-[80px] rounded-full" />
            <div className="relative z-10">
              <h2 className="font-headline text-3xl md:text-5xl font-bold mb-4 tracking-tight">
                Ready to audit?
              </h2>
              <p className="text-on-surface-variant/70 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
                Join 12,000+ operators managing their capital with absolute clarity.
              </p>
              <Link
                href="/signup"
                className="bg-primary text-on-primary font-semibold px-10 py-4 rounded-xl text-base hover:brightness-110 transition-all emerald-drop inline-block"
              >
                Deploy Ledgerly
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="bg-surface-container-lowest border-t border-outline-variant/15 pt-16 pb-8 px-6 md:px-12">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 mb-14">
          <div className="md:col-span-4">
            <span className="font-headline-md text-headline-md font-bold text-on-surface block mb-4">
              Ledgerly
            </span>
            <p className="text-on-surface-variant/60 text-sm leading-relaxed mb-6 max-w-xs">
              The premium operating system for high-net-worth capital management.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 rounded-full border border-outline-variant/20 flex items-center justify-center hover:bg-primary/10 hover:border-primary/40 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-on-surface-variant/60">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-full border border-outline-variant/20 flex items-center justify-center hover:bg-primary/10 hover:border-primary/40 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-on-surface-variant/60">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                </svg>
              </a>
            </div>
          </div>
          <div className="md:col-span-2">
            <h4 className="font-label-sm text-xs text-on-surface uppercase tracking-widest font-medium mb-5">
              Product
            </h4>
            <ul className="space-y-3 text-sm text-on-surface-variant/60">
              <li><a href="#" className="hover:text-primary transition-colors">Changelog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Integrations</a></li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <h4 className="font-label-sm text-xs text-on-surface uppercase tracking-widest font-medium mb-5">
              Company
            </h4>
            <ul className="space-y-3 text-sm text-on-surface-variant/60">
              <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Legal</a></li>
            </ul>
          </div>
          <div className="md:col-span-4">
            <h4 className="font-label-sm text-xs text-on-surface uppercase tracking-widest font-medium mb-5">
              Subscribe to Updates
            </h4>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="email@example.com"
                className="bg-surface-dim border border-outline-variant/20 rounded-lg px-4 py-2.5 flex-1 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
              />
              <button className="bg-on-surface text-surface py-2.5 px-5 rounded-lg text-sm font-medium hover:opacity-90 transition-all">
                Join
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center border-t border-outline-variant/10 pt-6">
          <p className="text-outline/40 text-xs">
            &copy; {currentYear} Ledgerly Inc. All rights reserved.
          </p>
          <div className="flex gap-6 mt-3 md:mt-0">
            <a href="#" className="text-outline/40 text-xs hover:text-on-surface-variant transition-colors">Security</a>
            <a href="#" className="text-outline/40 text-xs hover:text-on-surface-variant transition-colors">Privacy Policy</a>
            <a href="#" className="text-outline/40 text-xs hover:text-on-surface-variant transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
