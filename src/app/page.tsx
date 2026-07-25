'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  BarChart3,
  Shield,
  Globe,
  Zap,
  Receipt,
  Brain,
  ArrowRight,
  Check,
  X,
  Play,
  CreditCard,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Smart Analytics',
    description:
      'Real-time dashboards and AI-driven insights that surface spending anomalies before they impact your runway.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Shield,
    title: 'Bank-Grade Security',
    description:
      'End-to-end encryption with SOC 2 Type II compliance. Your financial data never leaves your control.',
    color: 'text-secondary',
    bg: 'bg-secondary/10',
  },
  {
    icon: Globe,
    title: 'Multi-Currency',
    description:
      'Real-time spot rates across 40+ currencies with automatic conversion and historical tracking.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Zap,
    title: 'Instant Sync',
    description:
      'Connect to 15,000+ banks via Plaid and Salt Edge. Transactions appear in real-time, not batches.',
    color: 'text-secondary',
    bg: 'bg-secondary/10',
  },
  {
    icon: Receipt,
    title: 'Smart Receipts',
    description:
      'OCR-powered receipt scanning that auto-categorizes expenses and matches them to transactions.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Brain,
    title: 'AI Forecasting',
    description:
      'Machine learning models that predict cash flow patterns and alert you to budget overruns early.',
    color: 'text-secondary',
    bg: 'bg-secondary/10',
  },
]

const STEPS = [
  {
    number: '01',
    icon: CreditCard,
    title: 'Connect Your Accounts',
    description:
      'Link your bank accounts, credit cards, and payment processors in under 60 seconds with our secure OAuth flow.',
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'Automate Everything',
    description:
      'Our AI categorizes transactions, extracts receipt data, and reconciles accounts automatically.',
  },
  {
    number: '03',
    icon: TrendingUp,
    title: 'Master Your Finances',
    description:
      'Get actionable insights, forecast cash flow, and make data-driven decisions with real-time dashboards.',
  },
]

const PRICING_PLANS = [
  {
    name: 'Starter',
    price: '$0',
    period: '/mo',
    description: 'Perfect for individuals getting started',
    features: [
      { text: 'Up to 100 transactions/mo', included: true },
      { text: 'Manual CSV import', included: true },
      { text: 'Basic analytics dashboard', included: true },
      { text: 'Single currency', included: true },
      { text: 'Bank sync', included: false },
      { text: 'AI insights', included: false },
    ],
    cta: 'Start for Free',
    featured: false,
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/mo',
    description: 'For professionals who need more power',
    features: [
      { text: 'Unlimited transactions', included: true },
      { text: 'Auto bank sync (15k+ banks)', included: true },
      { text: 'AI-powered insights', included: true },
      { text: 'Multi-currency support', included: true },
      { text: 'Receipt OCR scanning', included: true },
      { text: 'Priority support', included: true },
    ],
    cta: 'Get Started Free',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For teams with advanced requirements',
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Custom API endpoints', included: true },
      { text: 'Role-based access control', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'SLA guarantee', included: true },
    ],
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
          link.classList.remove('text-muted-foreground')
        } else {
          link.classList.remove('text-primary', 'font-bold')
          link.classList.add('text-muted-foreground')
        }
      })
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="bg-background text-foreground antialiased selection:bg-primary/30 selection:text-primary-foreground">
      <header className="flex justify-between items-center w-full px-md md:px-xl h-16 sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-lg md:gap-xl">
          <Link href="/" className="font-headline text-headline-md font-bold text-foreground tracking-tight">
            Ledgerly
          </Link>
          <nav className="hidden md:flex gap-lg items-center">
            <a href="#" className="text-primary font-bold border-b-2 border-primary pb-1 font-label-sm text-label-sm">
              Home
            </a>
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors duration-150 px-3 py-1 rounded font-label-sm text-label-sm">
              Features
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors duration-150 px-3 py-1 rounded font-label-sm text-label-sm">
              Pricing
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-md">
          <Link href="/login" className="text-muted-foreground hover:text-primary transition-colors font-medium text-body-md">
            Sign In
          </Link>
          <Link href="/signup" className="bg-primary text-primary-foreground font-body-md text-body-md px-md py-xs rounded-lg font-medium hover:scale-[0.98] transition-all">
            Get Started
          </Link>
        </div>
      </header>

      <main className="relative overflow-hidden pb-20 md:pb-0">
        <section className="hero-gradient relative pt-24 pb-16 md:pt-32 md:pb-24 px-md md:px-xl overflow-hidden">
          <div className="absolute top-20 left-[10%] w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-40 right-[5%] w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-[40%] w-64 h-64 bg-primary/3 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-32 left-[20%] w-2 h-2 bg-primary/40 rounded-full animate-pulse" />
          <div className="absolute top-48 right-[25%] w-1.5 h-1.5 bg-secondary/50 rounded-full animate-pulse delay-150" />
          <div className="absolute top-60 left-[60%] w-1 h-1 bg-primary/30 rounded-full animate-pulse delay-300" />
          <div className="absolute top-24 right-[40%] w-2.5 h-2.5 bg-secondary/30 rounded-full animate-pulse delay-200" />

          <div className="max-w-container-max mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-sm px-4 py-1.5 rounded-full border border-border bg-card/50 mb-xl animate-fade-in">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest">
                Now supporting 40+ currencies
              </span>
            </div>

            <h1
              className="font-headline text-display-lg md:text-[72px] md:leading-[1.1] mb-lg max-w-4xl mx-auto animate-slide-up"
              style={{ lineHeight: '1.1' }}
            >
              Master Your{' '}
              <span
                className="bg-gradient-to-r from-primary via-emerald-300 to-secondary bg-clip-text"
                style={{ WebkitTextFillColor: 'transparent' }}
              >
                Financial
              </span>{' '}
              Future
            </h1>

            <p className="font-body-lg text-body-lg text-muted-foreground max-w-2xl mx-auto mb-xl animate-slide-up delay-75">
              Transform chaotic financial data into precise strategic assets.
              Automated reconciliation, multi-currency mastery, and bank-grade
              security — all in one platform.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-md mb-2xl animate-slide-up delay-150">
              <Link
                href="/signup"
                className="bg-primary text-primary-foreground font-medium px-xl py-md rounded-xl text-body-lg hover:brightness-110 transition-all emerald-drop inline-flex items-center justify-center gap-sm"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#features"
                className="border border-border text-foreground font-medium px-xl py-md rounded-xl text-body-lg hover:bg-muted/50 transition-all inline-flex items-center justify-center gap-sm"
              >
                <Play className="w-4 h-4" />
                See How It Works
              </Link>
            </div>

            <div className="relative w-full max-w-5xl mx-auto animate-scale-in delay-300">
              <div className="absolute inset-0 bg-primary/8 blur-[120px] rounded-full -z-10 translate-y-20" />
              <div className="absolute -inset-4 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl -z-10" />
              <div
                className="glass-card rounded-2xl p-xs md:p-sm shadow-2xl overflow-hidden border border-border/30"
                style={{ transform: 'perspective(1000px) rotateX(2deg)' }}
              >
                <div className="bg-card rounded-xl border border-border/20 overflow-hidden shadow-inner">
                  <div className="h-8 bg-muted/30 border-b border-border/20 flex items-center px-md gap-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-secondary/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-primary/60" />
                  </div>
                  <div className="p-lg md:p-2xl">
                    <div className="w-full aspect-[16/9] bg-muted/30 rounded-lg flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
                      <div className="text-center relative z-10">
                        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-lg">
                          <TrendingUp className="w-10 h-10 text-primary/60" />
                        </div>
                        <p className="text-muted-foreground font-body-md text-body-md">
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

        <section className="py-lg md:py-xl bg-card/30 border-y border-border overflow-hidden">
          <div className="max-w-container-max mx-auto px-md md:px-xl">
            <p className="font-label-sm text-label-sm text-center text-muted-foreground uppercase tracking-widest mb-xl">
              Trusted by forward-thinking finance teams
            </p>
            <div className="flex flex-wrap justify-center items-center gap-xl md:gap-2xl">
              {['VERTEX', 'LINEAR', 'VULCAN', 'AETHER', 'SYNERGY'].map((name) => (
                <span
                  key={name}
                  className="font-headline text-headline-md font-bold text-muted-foreground/40 hover:text-muted-foreground/70 transition-all duration-300 cursor-default"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="py-xl md:py-2xl px-md md:px-xl" id="features">
          <div className="max-w-container-max mx-auto">
            <div className="text-center mb-2xl">
              <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-md">
                Features
              </p>
              <h2 className="font-headline text-headline-lg mb-sm text-foreground">
                Everything you need to master your finances
              </h2>
              <p className="text-muted-foreground font-body-md text-body-md max-w-xl mx-auto">
                Powerful tools designed for modern financial operations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
              {FEATURES.map((feature) => {
                const IconComp = feature.icon
                return (
                  <div
                    key={feature.title}
                    className="group p-lg md:p-xl rounded-2xl bg-card border border-border flex flex-col hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                  >
                    <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-lg`}>
                      <IconComp className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="font-headline text-headline-md mb-sm text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground font-body-md text-body-md">
                      {feature.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="py-xl md:py-2xl px-md md:px-xl bg-card/30 border-y border-border">
          <div className="max-w-container-max mx-auto">
            <div className="text-center mb-2xl">
              <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-md">
                How It Works
              </p>
              <h2 className="font-headline text-headline-lg mb-sm text-foreground">
                Start tracking in 3 simple steps
              </h2>
              <p className="text-muted-foreground font-body-md text-body-md">
                Get up and running in minutes, not days.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg relative">
              <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              {STEPS.map((step) => {
                const IconComp = step.icon
                return (
                  <div key={step.number} className="relative text-center group">
                    <div className="relative z-10 w-32 h-32 mx-auto mb-lg rounded-2xl bg-card border border-border flex flex-col items-center justify-center hover:border-primary/30 transition-all duration-300">
                      <span className="font-label-sm text-label-sm text-primary/60 uppercase tracking-widest mb-xs">
                        Step
                      </span>
                      <span className="font-headline text-headline-lg text-foreground font-bold leading-none">
                        {step.number}
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-md">
                      <IconComp className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-headline text-headline-md mb-sm text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground font-body-md text-body-md max-w-xs mx-auto">
                      {step.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="py-xl md:py-2xl px-md md:px-xl" id="pricing">
          <div className="max-w-container-max mx-auto">
            <div className="text-center mb-2xl">
              <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-md">
                Pricing
              </p>
              <h2 className="font-headline text-headline-lg mb-sm text-foreground">
                Simple, transparent pricing
              </h2>
              <p className="text-muted-foreground font-body-md text-body-md">
                Choose the plan that fits your needs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg md:gap-xl items-start">
              {PRICING_PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative p-lg md:p-xl rounded-2xl flex flex-col transition-all duration-300 ${
                    plan.featured
                      ? 'border-2 border-primary bg-card shadow-[0_0_40px_rgba(52,211,153,0.1)] scale-[1.02]'
                      : 'border border-border bg-card hover:border-muted-foreground/30'
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full uppercase tracking-widest font-label-sm">
                      Most Popular
                    </div>
                  )}
                  <span className="font-label-sm text-label-sm uppercase mb-md text-muted-foreground">
                    {plan.name}
                  </span>
                  <div className="flex items-end gap-xs mb-sm">
                    <span className="font-headline text-headline-lg text-foreground">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground mb-xs font-body-md">{plan.period}</span>
                    )}
                  </div>
                  <p className="text-muted-foreground font-body-md text-body-md mb-lg">
                    {plan.description}
                  </p>
                  <div className="h-px bg-border mb-lg" />
                  <ul className="space-y-md mb-2xl flex-1">
                    {plan.features.map((f) => (
                      <li key={f.text} className="flex items-center gap-sm text-body-md">
                        {f.included ? (
                          <Check className="w-4 h-4 text-primary shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                        )}
                        <span className={f.included ? 'text-foreground' : 'text-muted-foreground/50'}>
                          {f.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.featured ? '/signup' : '#'}
                    className={`w-full py-md rounded-xl font-medium transition-all text-center block ${
                      plan.featured
                        ? 'bg-primary text-primary-foreground hover:brightness-110'
                        : 'border border-border text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-xl md:py-2xl px-md md:px-xl relative">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-transparent to-secondary/3 pointer-events-none" />
          <div className="max-w-container-max mx-auto glass-card rounded-3xl p-lg md:p-2xl text-center border border-border overflow-hidden relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-primary/8 blur-[100px] rounded-full pointer-events-none" />
            <h2 className="font-headline text-headline-lg md:text-display-lg mb-md text-foreground relative z-10">
              Ready to take control of your finances?
            </h2>
            <p className="text-muted-foreground font-body-lg text-body-lg mb-xl max-w-xl mx-auto relative z-10">
              Get started for free. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-md relative z-10">
              <Link
                href="/signup"
                className="bg-primary text-primary-foreground font-medium px-xl md:px-2xl py-md rounded-xl text-body-lg hover:brightness-110 transition-all emerald-drop inline-flex items-center justify-center gap-sm"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#"
                className="border border-border text-foreground font-medium px-xl md:px-2xl py-md rounded-xl text-body-lg hover:bg-muted/50 transition-all inline-flex items-center justify-center gap-sm"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-card/50 border-t border-border pt-2xl pb-xl px-md md:px-xl">
        <div className="max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-12 gap-xl mb-2xl">
          <div className="md:col-span-4">
            <span className="font-headline text-headline-md font-bold text-foreground block mb-md">
              Ledgerly
            </span>
            <p className="text-muted-foreground font-body-md text-body-md mb-xl max-w-xs">
              The premium operating system for modern financial management.
            </p>
            <div className="flex gap-md">
              <a href="#" className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                  <path d="M9 18c-4.51 2-5-2-7-2" />
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect width="4" height="12" x="2" y="9" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
            </div>
          </div>
          <div className="md:col-span-2">
            <h4 className="font-label-sm text-label-sm text-foreground uppercase mb-lg">
              Product
            </h4>
            <ul className="space-y-sm text-muted-foreground font-body-md">
              <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Changelog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <h4 className="font-label-sm text-label-sm text-foreground uppercase mb-lg">
              Company
            </h4>
            <ul className="space-y-sm text-muted-foreground font-body-md">
              <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Legal</a></li>
            </ul>
          </div>
          <div className="md:col-span-4">
            <h4 className="font-label-sm text-label-sm text-foreground uppercase mb-lg">
              Stay Updated
            </h4>
            <p className="text-muted-foreground font-body-md text-body-md mb-md">
              Get the latest product updates and financial insights.
            </p>
            <div className="flex gap-sm">
              <input
                type="email"
                placeholder="email@example.com"
                className="bg-muted/50 border border-border rounded-lg px-md py-xs flex-1 focus:ring-1 focus:ring-primary focus:border-primary outline-none text-foreground placeholder:text-muted-foreground"
              />
              <button className="bg-primary text-primary-foreground py-xs px-md rounded-lg font-medium hover:brightness-110 transition-all">
                Subscribe
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-center border-t border-border pt-xl">
          <p className="text-muted-foreground font-label-sm text-label-sm">
            &copy; {currentYear} Ledgerly Inc. All rights reserved.
          </p>
          <div className="flex gap-xl mt-md md:mt-0">
            <a href="#" className="text-muted-foreground font-label-sm text-label-sm hover:text-foreground transition-colors">Security</a>
            <a href="#" className="text-muted-foreground font-label-sm text-label-sm hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="text-muted-foreground font-label-sm text-label-sm hover:text-foreground transition-colors">Terms</a>
          </div>
        </div>
      </footer>

      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-md pb-safe pt-sm md:hidden bg-card/90 backdrop-blur-lg border-t border-border">
        <a href="#" className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-xl px-4 py-1 scale-90 transition-all duration-150">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <span className="font-label-sm text-label-sm">Home</span>
        </a>
        <a href="#features" className="flex flex-col items-center justify-center text-muted-foreground px-4 py-1 active:bg-muted/50 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <span className="font-label-sm text-label-sm">Features</span>
        </a>
        <a href="#pricing" className="flex flex-col items-center justify-center text-muted-foreground px-4 py-1 active:bg-muted/50 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
          <span className="font-label-sm text-label-sm">Pricing</span>
        </a>
        <a href="/login" className="flex flex-col items-center justify-center text-muted-foreground px-4 py-1 active:bg-muted/50 transition-all">
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
