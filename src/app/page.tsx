'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const FEATURES = [
  {
    icon: 'insights',
    title: 'Smart Insights',
    description: 'AI-driven patterns that detect anomalies and spending trends before they impact your runway.',
    span: 'md:col-span-7',
    hasVisual: true,
  },
  {
    icon: 'calculate',
    title: 'VAT Calculations',
    description: 'Automatic tax extraction and VAT compliance across 120+ jurisdictions.',
    span: 'md:col-span-5',
    hasCalc: true,
  },
  {
    icon: 'currency_exchange',
    title: 'Multi-currency',
    description: 'Real-time spot rates with historical data syncing for seamless cross-border reporting.',
    span: 'md:col-span-5',
  },
  {
    icon: 'sync_alt',
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
      <header className="flex justify-between items-center w-full px-xl h-16 sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-outline-variant">
        <div className="flex items-center gap-xl">
          <Link
            href="/"
            className="font-headline-md text-headline-md font-bold text-on-surface"
          >
            Ledgerly
          </Link>
          <nav className="hidden md:flex gap-lg items-center">
            <a
              href="#"
              className="text-primary font-bold border-b-2 border-primary pb-1 font-label-sm text-label-sm"
            >
              Home
            </a>
            <a
              href="#features"
              className="text-on-surface-variant hover:bg-surface-variant transition-colors duration-150 px-3 py-1 rounded font-label-sm text-label-sm"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-on-surface-variant hover:bg-surface-variant transition-colors duration-150 px-3 py-1 rounded font-label-sm text-label-sm"
            >
              Pricing
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-md">
          <Link
            href="/login"
            className="text-on-surface-variant hover:text-primary transition-colors font-medium text-body-md"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="bg-primary-container text-on-primary-container font-body-md text-body-md px-md py-xs rounded-lg font-medium hover:scale-[0.98] transition-all"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="relative overflow-hidden">
        {/* Hero Section */}
        <section className="hero-gradient pt-24 pb-12 px-md md:px-xl">
          <div className="max-w-[1280px] mx-auto text-center">
            <div className="inline-flex items-center gap-sm px-3 py-1 rounded-full border border-outline-variant bg-surface-container-low mb-lg">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest">
                Now supporting 40+ Currencies
              </span>
            </div>
            <h1 className="font-display-lg text-display-lg md:text-6xl mb-md max-w-4xl mx-auto leading-tight">
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
            <div className="relative max-w-5xl mx-auto mt-xl">
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
                        <span className="material-symbols-outlined text-primary text-6xl mb-md block">
                          dashboard
                        </span>
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

        {/* Feature Bento Grid */}
        <section className="py-2xl px-md md:px-xl" id="features">
          <div className="max-w-[1280px] mx-auto">
            <div className="text-center mb-2xl">
              <h2 className="font-headline-lg text-headline-lg mb-sm">
                Engineered for Precision
              </h2>
              <p className="text-on-surface-variant font-body-md text-body-md">
                Tools built for the modern financial operator.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-lg h-auto">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className={`${feature.span} glass-card p-xl rounded-2xl border border-outline-variant/20 flex flex-col justify-between group hover:border-primary/50 transition-all duration-300`}
                >
                  <div>
                    <div className="w-12 h-12 bg-primary-container/20 rounded-lg flex items-center justify-center mb-lg">
                      <span
                        className="material-symbols-outlined text-primary"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {feature.icon}
                      </span>
                    </div>
                    <h3 className="font-headline-md text-headline-md mb-md">
                      {feature.title}
                    </h3>
                    <p className="text-on-surface-variant font-body-md text-body-md max-w-sm">
                      {feature.description}
                    </p>
                  </div>

                  {feature.hasVisual && (
                    <div className="mt-xl h-48 bg-surface-container-high rounded-xl overflow-hidden relative border border-outline-variant/10 flex items-center justify-center">
                      <div className="flex gap-md">
                        <div className="w-3 h-16 bg-primary/60 rounded-full self-end" />
                        <div className="w-3 h-24 bg-primary/80 rounded-full self-end" />
                        <div className="w-3 h-12 bg-primary/40 rounded-full self-end" />
                        <div className="w-3 h-20 bg-primary/70 rounded-full self-end" />
                        <div className="w-3 h-8 bg-primary/30 rounded-full self-end" />
                        <div className="w-3 h-28 bg-primary rounded-full self-end" />
                      </div>
                    </div>
                  )}

                  {feature.hasCalc && (
                    <div className="bg-surface-container rounded-lg p-md font-mono text-xs border border-outline-variant/20 mt-xl">
                      <div className="flex justify-between text-on-surface-variant border-b border-outline-variant/10 pb-xs mb-xs">
                        <span>NET AMOUNT</span>
                        <span className="text-on-surface">$1,240.00</span>
                      </div>
                      <div className="flex justify-between text-on-surface-variant border-b border-outline-variant/10 pb-xs mb-xs">
                        <span>VAT (21%)</span>
                        <span className="text-primary">+$260.40</span>
                      </div>
                      <div className="flex justify-between font-bold text-on-surface">
                        <span>TOTAL AUDITED</span>
                        <span>$1,500.40</span>
                      </div>
                    </div>
                  )}

                  {feature.hasBanks && (
                    <div className="flex-1 flex justify-center items-center mt-xl">
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
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-2xl bg-surface-container-lowest overflow-hidden border-y border-outline-variant/20">
          <div className="max-w-[1280px] mx-auto px-md md:px-xl">
            <p className="font-label-sm text-label-sm text-center text-outline uppercase tracking-widest mb-2xl">
              Trusted by leaders at
            </p>
            <div className="flex flex-wrap justify-center items-center gap-2xl opacity-50 contrast-125 grayscale">
              {['VERTEX', 'LINEAR', 'VULCAN', 'AETHER', 'SYNERGY'].map(
                (name) => (
                  <span
                    key={name}
                    className="font-headline-md text-headline-md font-bold"
                  >
                    {name}
                  </span>
                )
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-xl mt-2xl">
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.name}
                  className="p-xl rounded-2xl bg-surface-dim border border-outline-variant/10 italic"
                >
                  <p className="text-body-lg text-on-surface mb-lg">
                    {t.quote}
                  </p>
                  <div className="flex items-center gap-md not-italic">
                    <div
                      className={`w-10 h-10 rounded-full ${t.color}`}
                    />
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

        {/* Pricing Section */}
        <section className="py-2xl px-md md:px-xl" id="pricing">
          <div className="max-w-[1280px] mx-auto">
            <div className="text-center mb-2xl">
              <h2 className="font-headline-lg text-headline-lg mb-sm">
                Transparent Scaling
              </h2>
              <p className="text-on-surface-variant font-body-md text-body-md">
                Choose the workspace that fits your volume.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-xl">
              {PRICING_PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`p-xl rounded-2xl flex flex-col ${
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
                  <span
                    className={`font-label-sm text-label-sm uppercase mb-md ${
                      plan.featured ? 'text-primary' : 'text-outline'
                    }`}
                  >
                    {plan.name}
                  </span>
                  <div className="flex items-end gap-xs mb-lg">
                    <span className="font-headline-lg text-headline-lg">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-on-surface-variant mb-xs">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-md mb-2xl flex-1">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-sm text-body-md"
                      >
                        <span className="material-symbols-outlined text-primary text-sm">
                          check_circle
                        </span>
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

        {/* Final CTA */}
        <section className="py-2xl px-md md:px-xl relative">
          <div className="max-w-[1280px] mx-auto glass-card rounded-3xl p-2xl text-center border border-primary/20 overflow-hidden">
            <h2 className="font-display-lg text-display-lg mb-md">
              Ready to audit?
            </h2>
            <p className="text-on-surface-variant font-body-lg text-body-lg mb-xl max-w-xl mx-auto">
              Join 12,000+ operators managing their capital with absolute
              clarity.
            </p>
            <Link
              href="/signup"
              className="bg-primary text-on-primary font-medium px-2xl py-md rounded-xl text-body-lg hover:brightness-110 transition-all emerald-drop inline-block"
            >
              Deploy Ledgerly
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest border-t border-outline-variant/20 pt-2xl pb-xl px-md md:px-xl">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-xl mb-2xl">
          <div className="md:col-span-4">
            <span className="font-headline-md text-headline-md font-bold text-on-surface block mb-md">
              Ledgerly
            </span>
            <p className="text-on-surface-variant font-body-md text-body-md mb-xl">
              The premium operating system for high-net-worth capital management.
            </p>
            <div className="flex gap-md">
              <a
                href="#"
                className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-all"
              >
                <span className="material-symbols-outlined text-sm">public</span>
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-all"
              >
                <span className="material-symbols-outlined text-sm">share</span>
              </a>
            </div>
          </div>
          <div className="md:col-span-2">
            <h4 className="font-label-sm text-label-sm text-on-surface uppercase mb-lg">
              Product
            </h4>
            <ul className="space-y-sm text-on-surface-variant font-body-md">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Changelog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Integrations
                </a>
              </li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <h4 className="font-label-sm text-label-sm text-on-surface uppercase mb-lg">
              Company
            </h4>
            <ul className="space-y-sm text-on-surface-variant font-body-md">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Legal
                </a>
              </li>
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
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row justify-between items-center border-t border-outline-variant/10 pt-xl">
          <p className="text-outline font-label-sm text-label-sm">
            &copy; {currentYear} Ledgerly Inc. All rights reserved.
          </p>
          <div className="flex gap-xl mt-md md:mt-0">
            <a
              href="#"
              className="text-outline font-label-sm text-label-sm hover:text-on-surface"
            >
              Security
            </a>
            <a
              href="#"
              className="text-outline font-label-sm text-label-sm hover:text-on-surface"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-outline font-label-sm text-label-sm hover:text-on-surface"
            >
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
