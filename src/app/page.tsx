'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Globe,
  Receipt,
  Brain,
  ArrowRight,
  Check,
  X,
  Play,
  CreditCard,
  Sparkles,
  TrendingUp,
  Users,
  ShieldCheck,
  Handshake,
  Zap,
  BarChart3,
  Shield,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Shield,
    title: 'Bank-Grade Security',
    description:
      'End-to-end encryption with SOC 2 Type II compliance. Your financial data never leaves your control.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Zap,
    title: 'Global Bank Sync',
    description:
      'Connect to 15,000+ financial institutions via Plaid, Salt Edge, and direct API endpoints.',
    color: 'text-secondary',
    bg: 'bg-secondary/10',
  },
  {
    icon: Globe,
    title: 'Multi-Currency',
    description:
      'Real-time spot rates with historical data syncing for seamless cross-border reporting.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: BarChart3,
    title: 'Smart Analytics',
    description:
      'Real-time dashboards and AI-driven insights that surface spending anomalies before they impact your runway.',
    color: 'text-secondary',
    bg: 'bg-secondary/10',
  },
  {
    icon: Brain,
    title: 'Smart Insights',
    description:
      'AI-driven patterns that detect anomalies and spending trends before they impact your runway.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Receipt,
    title: 'VAT Calculations',
    description:
      'Automatic tax extraction and VAT compliance across 120+ jurisdictions.',
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
    <div className="bg-background text-foreground antialiased selection:bg-primary/30 selection:text-primary-foreground text-center">
      {/* Header */}
      <header className="flex justify-between items-center w-full px-2 md:px-10 h-14 md:h-16 sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border text-left">
        <Link href="/" className="font-headline text-lg md:text-headline-md font-bold text-foreground tracking-tight">
          Ledgerly
        </Link>
        <nav className="hidden md:flex gap-6 items-center">
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
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-muted-foreground hover:text-primary transition-colors font-medium text-sm hidden sm:inline">
            Sign In
          </Link>
          <Link href="/signup" className="bg-primary text-primary-foreground text-sm px-2 py-1.5 rounded-lg font-medium hover:scale-[0.98] transition-all">
            Get Started
          </Link>
        </div>
      </header>

      <main className="relative overflow-hidden pb-24 md:pb-0">
        {/* Hero */}
        <section className="hero-gradient relative pt-16 pb-12 md:pt-32 md:pb-24 px-2 md:px-10 flex flex-col items-center overflow-hidden">
          <div className="absolute top-20 left-[10%] w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-40 right-[5%] w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-[40%] w-64 h-64 bg-primary/3 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-32 left-[20%] w-2 h-2 bg-primary/40 rounded-full animate-pulse" />
          <div className="absolute top-48 right-[25%] w-1.5 h-1.5 bg-secondary/50 rounded-full animate-pulse delay-150" />
          <div className="absolute top-60 left-[60%] w-1 h-1 bg-primary/30 rounded-full animate-pulse delay-300" />
          <div className="absolute top-24 right-[40%] w-2.5 h-2.5 bg-secondary/30 rounded-full animate-pulse delay-200" />

          <div className="max-w-container-max w-full flex flex-col items-center text-center relative z-10">
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-border bg-card/50 mb-6 md:mb-10 animate-fade-in">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="font-label-sm text-xs md:text-label-sm text-primary uppercase tracking-widest">
                Now supporting 40+ currencies
              </span>
            </div>

            <h1 className="font-headline text-[32px] sm:text-[40px] md:text-display-lg lg:text-[72px] leading-[1.1] tracking-tight mb-4 md:mb-6 max-w-4xl animate-slide-up">
              Master Your{' '}
              <span
                className="bg-gradient-to-r from-primary via-emerald-300 to-secondary bg-clip-text"
                style={{ WebkitTextFillColor: 'transparent' }}
              >
                Financial
              </span>{' '}
              Future
            </h1>

            <p className="font-body-md text-body-lg md:text-xl leading-relaxed text-muted-foreground mx-auto max-w-2xl mb-10 md:mb-16 animate-slide-up delay-75">
              Transform chaotic financial data into precise strategic assets.
              Automated reconciliation, multi-currency mastery, and bank-grade
              security — all in one platform.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 mb-16 animate-slide-up delay-150">
              <Link
                href="/signup"
                className="bg-primary text-primary-foreground font-medium px-10 py-3 rounded-xl text-body-md md:text-body-lg hover:brightness-110 transition-all emerald-drop inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#features"
                className="border border-border text-foreground font-medium px-10 py-3 rounded-xl text-body-md md:text-body-lg hover:bg-muted/50 transition-all inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Play className="w-4 h-4" />
                See How It Works
              </Link>
            </div>

            <div className="relative w-full max-w-4xl mx-auto animate-scale-in delay-300 hidden sm:block">
              <div className="absolute inset-0 bg-primary/8 blur-[120px] rounded-full -z-10 translate-y-20" />
              <div className="absolute -inset-4 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl -z-10" />
              <div className="glass-card rounded-2xl p-1 md:p-2 shadow-2xl overflow-hidden border border-border/30 md:perspective-[1000px] md:rotate-x-[2deg]">
                <div className="bg-card rounded-xl border border-border/20 overflow-hidden shadow-inner">
                  <div className="h-8 bg-muted/30 border-b border-border/20 flex items-center px-4 gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-secondary/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-primary/60" />
                  </div>
                  <div className="p-4 md:p-16">
                    <div className="w-full aspect-[16/9] bg-muted/30 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
                      <div className="flex flex-col items-center text-center relative z-10">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                          <TrendingUp className="w-8 h-8 md:w-10 md:h-10 text-primary/60" />
                        </div>
                        <p className="text-muted-foreground font-body-md text-sm md:text-body-md leading-relaxed">
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

        {/* Features */}
        <section className="py-10 md:py-16 px-2 md:px-10 flex flex-col items-center" id="features">
          <div className="max-w-container-max w-full flex flex-col items-center">
            <div className="flex flex-col items-center text-center mb-6 md:mb-16">
              <p className="font-label-sm text-xs md:text-label-sm text-primary uppercase tracking-widest mb-2 md:mb-4">
                Features
              </p>
              <h2 className="font-headline text-xl md:text-headline-lg tracking-tight mb-2 text-foreground">
                Engineered for Precision
              </h2>
              <p className="text-muted-foreground font-body-md text-sm md:text-body-md leading-relaxed max-w-xl">
                Tools built for the modern financial operator.
              </p>
            </div>

            <div className="flex flex-col md:flex-row md:flex-wrap gap-2 md:gap-6 justify-center w-full">
              {FEATURES.map((feature) => {
                const IconComp = feature.icon
                return (
                  <div
                    key={feature.title}
                    className="group inline-flex flex-col items-center text-center p-4 md:p-10 rounded-2xl bg-card border border-border w-full md:w-[calc(33.333%-1rem)] hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                  >
                    <div className={`w-12 h-12 md:w-14 md:h-14 ${feature.bg} rounded-2xl flex items-center justify-center mb-4 md:mb-6`}>
                      <IconComp className={`w-6 h-6 md:w-7 md:h-7 ${feature.color}`} />
                    </div>
                    <h3 className="font-headline text-base md:text-headline-md tracking-tight mb-1 md:mb-2 text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground font-body-md text-sm md:text-body-md leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-10 md:py-16 px-2 md:px-10 bg-card/30 border-y border-border flex flex-col items-center">
          <div className="max-w-container-max w-full flex flex-col items-center">
            <div className="flex flex-col items-center text-center mb-6 md:mb-16">
              <p className="font-label-sm text-xs md:text-label-sm text-primary uppercase tracking-widest mb-2 md:mb-4">
                How It Works
              </p>
              <h2 className="font-headline text-xl md:text-headline-lg tracking-tight mb-2 text-foreground">
                Start tracking in 3 simple steps
              </h2>
              <p className="text-muted-foreground font-body-md text-sm md:text-body-md leading-relaxed max-w-xl">
                Get up and running in minutes, not days.
              </p>
            </div>

            <div className="flex flex-col md:flex-row md:flex-wrap gap-6 md:gap-6 relative justify-center w-full">
              <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              {STEPS.map((step) => {
                const IconComp = step.icon
                return (
                  <div key={step.number} className="relative text-center group inline-flex flex-col items-center w-full md:w-[calc(33.333%-1rem)]">
                    <div className="relative z-10 w-24 h-24 md:w-32 md:h-32 mb-4 md:mb-6 rounded-2xl bg-card border border-border flex flex-col items-center justify-center hover:border-primary/30 transition-all duration-300">
                      <span className="font-label-sm text-xs md:text-label-sm text-primary/60 uppercase tracking-widest mb-0.5 md:mb-1">
                        Step
                      </span>
                      <span className="font-headline text-2xl md:text-headline-lg text-foreground font-bold leading-none tracking-tight">
                        {step.number}
                      </span>
                    </div>
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 md:mb-4">
                      <IconComp className="w-6 h-6 md:w-7 md:h-7 text-primary" />
                    </div>
                    <h3 className="font-headline text-base md:text-headline-md tracking-tight mb-1 md:mb-2 text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground font-body-md text-sm md:text-body-md leading-relaxed max-w-xs">
                      {step.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Teams */}
        <section className="py-10 md:py-16 px-2 md:px-10 bg-card/30 border-y border-border flex flex-col items-center">
          <div className="max-w-container-max w-full flex flex-col items-center">
            <div className="flex flex-col items-center text-center mb-6 md:mb-16">
              <p className="font-label-sm text-xs md:text-label-sm text-primary uppercase tracking-widest mb-2 md:mb-4">
                For Teams
              </p>
              <h2 className="font-headline text-xl md:text-headline-lg tracking-tight mb-2 text-foreground">
                Built for Teams
              </h2>
              <p className="text-muted-foreground font-body-md text-sm md:text-body-md leading-relaxed max-w-xl">
                Invite clients, manage permissions, and track team expenses in one place
              </p>
            </div>

            <div className="flex flex-col md:flex-row md:flex-wrap gap-2 md:gap-6 justify-center w-full">
              {[
                { icon: Users, title: 'Client Management', desc: 'Create client accounts, assign roles, and manage access with ease', color: 'text-primary', bg: 'bg-primary/10' },
                { icon: ShieldCheck, title: 'Role-Based Access', desc: 'Managers get full control, clients see only their own data', color: 'text-secondary', bg: 'bg-secondary/10' },
                { icon: Handshake, title: 'Team Collaboration', desc: 'Work together with shared categories, budgets, and real-time insights', color: 'text-primary', bg: 'bg-primary/10' },
              ].map((item) => (
                <div
                  key={item.title}
                  className="inline-flex flex-col items-center text-center p-4 md:p-10 rounded-2xl bg-card border border-border w-full md:w-[calc(33.333%-1rem)] hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                >
                  <div className={`w-12 h-12 md:w-14 md:h-14 ${item.bg} rounded-2xl flex items-center justify-center mb-4 md:mb-6`}>
                    <item.icon className={`w-6 h-6 md:w-7 md:h-7 ${item.color}`} />
                  </div>
                  <h3 className="font-headline text-base md:text-headline-md tracking-tight mb-1 md:mb-2 text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground font-body-md text-sm md:text-body-md leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-center mt-6 md:mt-16">
              <Link
                href="/org-signup"
                className="bg-primary text-primary-foreground font-medium px-6 py-3 rounded-xl text-sm md:text-body-lg hover:brightness-110 transition-all emerald-drop inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                Set Up Your Team
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-10 md:py-16 px-2 md:px-10 flex flex-col items-center" id="pricing">
          <div className="max-w-container-max w-full flex flex-col items-center">
            <div className="flex flex-col items-center text-center mb-6 md:mb-16">
              <p className="font-label-sm text-xs md:text-label-sm text-primary uppercase tracking-widest mb-2 md:mb-4">
                Pricing
              </p>
              <h2 className="font-headline text-xl md:text-headline-lg tracking-tight mb-2 text-foreground">
                Simple, transparent pricing
              </h2>
              <p className="text-muted-foreground font-body-md text-sm md:text-body-md leading-relaxed max-w-xl">
                Choose the plan that fits your needs.
              </p>
            </div>

            <div className="flex flex-col md:flex-row md:flex-wrap gap-2 md:gap-6 justify-center items-stretch w-full">
              {PRICING_PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative inline-flex flex-col items-center text-center p-4 md:p-10 rounded-2xl w-full md:w-[calc(33.333%-1.33rem)] transition-all duration-300 ${
                    plan.featured
                      ? 'border-2 border-primary bg-card shadow-[0_0_40px_rgba(52,211,153,0.1)] md:scale-[1.02] hover:shadow-[0_0_60px_rgba(52,211,153,0.15)]'
                      : 'border border-border bg-card hover:border-muted-foreground/30 hover:shadow-lg hover:-translate-y-1'
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full uppercase tracking-widest font-label-sm">
                      Most Popular
                    </div>
                  )}
                  <span className="font-label-sm text-xs md:text-label-sm uppercase mb-2 md:mb-4 text-muted-foreground">
                    {plan.name}
                  </span>
                  <div className="flex items-end justify-center gap-1 mb-1 md:mb-2">
                    <span className="font-headline text-2xl md:text-headline-lg text-foreground">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground mb-0.5 font-body-md text-sm">{plan.period}</span>
                    )}
                  </div>
                  <p className="text-muted-foreground font-body-md text-sm md:text-body-md mb-4 md:mb-6">
                    {plan.description}
                  </p>
                  <div className="h-px bg-border mb-4 md:mb-6" />
                  <ul className="space-y-2 md:space-y-4 mb-10 md:mb-16 flex-1 w-full">
                    {plan.features.map((f) => (
                      <li key={f.text} className="flex items-center gap-2 text-sm md:text-body-md">
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
                    className={`w-full py-3 rounded-xl font-medium transition-all text-center block ${
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

        {/* CTA */}
        <section className="py-10 md:py-16 px-2 md:px-10 relative flex flex-col items-center">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-transparent to-secondary/3 pointer-events-none" />
          <div className="max-w-container-max w-full glass-card rounded-2xl md:rounded-3xl p-4 md:p-16 flex flex-col items-center text-center border border-border overflow-hidden relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-primary/8 blur-[100px] rounded-full pointer-events-none" />
            <h2 className="font-headline text-xl md:text-headline-lg lg:text-display-lg tracking-tight mb-2 md:mb-4 text-foreground relative z-10">
              Ready to take control of your finances?
            </h2>
            <p className="text-muted-foreground font-body-md text-sm md:text-body-lg leading-relaxed mb-6 md:mb-10 max-w-xl relative z-10">
              Get started for free. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 relative z-10 w-full sm:w-auto">
              <Link
                href="/signup"
                className="bg-primary text-primary-foreground font-medium px-6 py-3 rounded-xl text-sm md:text-body-lg hover:brightness-110 transition-all emerald-drop inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#"
                className="border border-border text-foreground font-medium px-6 py-3 rounded-xl text-sm md:text-body-lg hover:bg-muted/50 transition-all inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-card/50 border-t border-border pt-10 md:pt-16 pb-6 md:pb-10 px-2 md:px-10 flex flex-col items-center">
        <div className="max-w-container-max w-full flex flex-col md:flex-row md:flex-wrap justify-center items-start gap-10 md:gap-16 mb-10 md:mb-16">
          <div className="flex flex-col w-full md:w-auto md:min-w-[200px]">
            <span className="font-headline text-lg md:text-headline-md font-bold text-foreground block mb-2 md:mb-4 tracking-tight">
              Ledgerly
            </span>
            <p className="text-muted-foreground font-body-md text-sm md:text-body-md leading-relaxed mb-6 md:mb-10 max-w-xs">
              The premium operating system for modern financial management.
            </p>
            <div className="flex gap-2">
              {['M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z',
                'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4|M9 18c-4.51 2-5-2-7-2',
                'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z|M2 9h2v12H2z|M4 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
              ].map((d, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                    <path d={d} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
          <div className="flex flex-col min-w-[120px]">
            <h4 className="font-label-sm text-xs md:text-label-sm text-foreground uppercase mb-4 md:mb-6 tracking-wider">
              Product
            </h4>
            <ul className="space-y-2 text-muted-foreground font-body-md text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Changelog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
            </ul>
          </div>
          <div className="flex flex-col min-w-[120px]">
            <h4 className="font-label-sm text-xs md:text-label-sm text-foreground uppercase mb-4 md:mb-6 tracking-wider">
              Company
            </h4>
            <ul className="space-y-2 text-muted-foreground font-body-md text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Legal</a></li>
            </ul>
          </div>
          <div className="flex flex-col w-full md:w-auto md:min-w-[200px]">
            <h4 className="font-label-sm text-xs md:text-label-sm text-foreground uppercase mb-4 md:mb-6 tracking-wider">
              Stay Updated
            </h4>
            <p className="text-muted-foreground font-body-md text-sm md:text-body-md mb-2">
              Get the latest product updates and financial insights.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="email@example.com"
                className="bg-muted/50 border border-border rounded-lg px-2 py-2 flex-1 min-w-0 focus:ring-1 focus:ring-primary focus:border-primary outline-none text-foreground placeholder:text-muted-foreground text-sm"
              />
              <button className="bg-primary text-primary-foreground py-2 px-2 rounded-lg font-medium hover:brightness-110 transition-all text-sm whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-container-max w-full flex flex-col md:flex-row justify-center items-center gap-2 md:gap-6 border-t border-border pt-6 md:pt-10">
          <p className="text-muted-foreground font-label-sm text-xs md:text-label-sm text-center">
            &copy; {currentYear} Ledgerly Inc. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-muted-foreground font-label-sm text-xs md:text-label-sm hover:text-foreground transition-colors">Security</a>
            <a href="#" className="text-muted-foreground font-label-sm text-xs md:text-label-sm hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="text-muted-foreground font-label-sm text-xs md:text-label-sm hover:text-foreground transition-colors">Terms</a>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-3 pb-safe pt-2 md:hidden bg-card/90 backdrop-blur-lg border-t border-border text-left">
        <Link href="/" className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-xl px-3 py-1.5 transition-all duration-150 active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <span className="text-[10px] mt-0.5 font-medium">Home</span>
        </Link>
        <Link href="#features" className="flex flex-col items-center justify-center text-muted-foreground px-3 py-1.5 active:bg-muted/50 transition-all active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <span className="text-[10px] mt-0.5">Features</span>
        </Link>
        <Link href="#pricing" className="flex flex-col items-center justify-center text-muted-foreground px-3 py-1.5 active:bg-muted/50 transition-all active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
          <span className="text-[10px] mt-0.5">Pricing</span>
        </Link>
        <Link href="/login" className="flex flex-col items-center justify-center text-muted-foreground px-3 py-1.5 active:bg-muted/50 transition-all active:scale-95" aria-label="Sign in">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
          <span className="text-[10px] mt-0.5">Sign In</span>
        </Link>
      </nav>
    </div>
  )
}
