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
    <div className="bg-background text-foreground antialiased selection:bg-primary/30 selection:text-primary-foreground">
      {/* Header */}
      <header className="flex justify-between items-center w-full px-sm md:px-xl h-14 md:h-16 sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <Link href="/" className="font-headline text-lg md:text-headline-md font-bold text-foreground tracking-tight">
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
        <div className="flex items-center gap-sm">
          <Link href="/login" className="text-muted-foreground hover:text-primary transition-colors font-medium text-sm hidden sm:inline">
            Sign In
          </Link>
          <Link href="/signup" className="bg-primary text-primary-foreground text-sm px-sm py-1.5 rounded-lg font-medium hover:scale-[0.98] transition-all">
            Get Started
          </Link>
        </div>
      </header>

      <main className="relative overflow-hidden pb-24 md:pb-0">
        {/* Hero */}
        <section className="hero-gradient relative pt-16 pb-12 md:pt-32 md:pb-24 px-sm md:px-xl flex flex-col items-center overflow-hidden">
          <div className="absolute top-20 left-[10%] w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-40 right-[5%] w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-[40%] w-64 h-64 bg-primary/3 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-32 left-[20%] w-2 h-2 bg-primary/40 rounded-full animate-pulse" />
          <div className="absolute top-48 right-[25%] w-1.5 h-1.5 bg-secondary/50 rounded-full animate-pulse delay-150" />
          <div className="absolute top-60 left-[60%] w-1 h-1 bg-primary/30 rounded-full animate-pulse delay-300" />
          <div className="absolute top-24 right-[40%] w-2.5 h-2.5 bg-secondary/30 rounded-full animate-pulse delay-200" />

          <div className="max-w-container-max w-full flex flex-col items-center text-center relative z-10">
            <div className="inline-flex items-center gap-xs px-3 py-1 rounded-full border border-border bg-card/50 mb-lg md:mb-xl animate-fade-in">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="font-label-sm text-xs md:text-label-sm text-primary uppercase tracking-widest">
                Now supporting 40+ currencies
              </span>
            </div>

            <h1 className="font-headline text-[32px] sm:text-[40px] md:text-display-lg lg:text-[72px] leading-[1.1] tracking-tight mb-md md:mb-lg max-w-4xl animate-slide-up">
              Master Your{' '}
              <span
                className="bg-gradient-to-r from-primary via-emerald-300 to-secondary bg-clip-text"
                style={{ WebkitTextFillColor: 'transparent' }}
              >
                Financial
              </span>{' '}
              Future
            </h1>

            <p className="text-muted-foreground font-body-md text-sm md:text-body-lg leading-relaxed max-w-xl mb-lg md:mb-xl animate-slide-up delay-75">
              Transform chaotic financial data into precise strategic assets.
              Automated reconciliation, multi-currency mastery, and bank-grade
              security — all in one platform.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-sm sm:gap-md mb-xl md:mb-2xl w-full sm:w-auto animate-slide-up delay-150">
              <Link
                href="/signup"
                className="bg-primary text-primary-foreground font-medium px-lg py-3 rounded-xl text-sm md:text-body-lg hover:brightness-110 transition-all emerald-drop inline-flex items-center justify-center gap-sm w-full sm:w-auto"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#features"
                className="border border-border text-foreground font-medium px-lg py-3 rounded-xl text-sm md:text-body-lg hover:bg-muted/50 transition-all inline-flex items-center justify-center gap-sm w-full sm:w-auto"
              >
                <Play className="w-4 h-4" />
                See How It Works
              </Link>
            </div>

            <div className="relative w-full max-w-4xl mx-auto animate-scale-in delay-300 hidden sm:block">
              <div className="absolute inset-0 bg-primary/8 blur-[120px] rounded-full -z-10 translate-y-20" />
              <div className="absolute -inset-4 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl -z-10" />
              <div className="glass-card rounded-2xl p-xs md:p-sm shadow-2xl overflow-hidden border border-border/30 md:perspective-[1000px] md:rotate-x-[2deg]">
                <div className="bg-card rounded-xl border border-border/20 overflow-hidden shadow-inner">
                  <div className="h-8 bg-muted/30 border-b border-border/20 flex items-center px-md gap-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-secondary/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-primary/60" />
                  </div>
                  <div className="p-md md:p-2xl">
                    <div className="w-full aspect-[16/9] bg-muted/30 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
                      <div className="flex flex-col items-center text-center relative z-10">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-md">
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

        {/* Trusted By */}
        <section className="py-md md:py-xl bg-card/30 border-y border-border flex flex-col items-center">
          <div className="max-w-container-max w-full flex flex-col items-center px-sm md:px-xl">
            <p className="font-label-sm text-xs md:text-label-sm text-center text-muted-foreground uppercase tracking-widest mb-md md:mb-xl">
              Trusted by forward-thinking finance teams
            </p>
            <div className="flex flex-wrap justify-center items-center gap-lg md:gap-2xl">
              {['VERTEX', 'LINEAR', 'VULCAN', 'AETHER', 'SYNERGY'].map((name) => (
                <span
                  key={name}
                  className="font-headline text-base md:text-headline-md font-bold text-muted-foreground/40 hover:text-muted-foreground/70 transition-all duration-300 cursor-default tracking-tight"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-xl md:py-2xl px-sm md:px-xl flex flex-col items-center" id="features">
          <div className="max-w-container-max w-full flex flex-col items-center">
            <div className="flex flex-col items-center text-center mb-lg md:mb-2xl">
              <p className="font-label-sm text-xs md:text-label-sm text-primary uppercase tracking-widest mb-sm md:mb-md">
                Features
              </p>
              <h2 className="font-headline text-xl md:text-headline-lg tracking-tight mb-sm text-foreground">
                Engineered for Precision
              </h2>
              <p className="text-muted-foreground font-body-md text-sm md:text-body-md leading-relaxed max-w-xl">
                Tools built for the modern financial operator.
              </p>
            </div>

            <div className="flex flex-col md:flex-row md:flex-wrap gap-sm md:gap-lg justify-center w-full">
              {FEATURES.map((feature) => {
                const IconComp = feature.icon
                return (
                  <div
                    key={feature.title}
                    className="group inline-flex flex-col items-center text-center p-md md:p-xl rounded-2xl bg-card border border-border w-full md:w-[calc(33.333%-1rem)] hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                  >
                    <div className={`w-12 h-12 md:w-14 md:h-14 ${feature.bg} rounded-2xl flex items-center justify-center mb-md md:mb-lg`}>
                      <IconComp className={`w-6 h-6 md:w-7 md:h-7 ${feature.color}`} />
                    </div>
                    <h3 className="font-headline text-base md:text-headline-md tracking-tight mb-xs md:mb-sm text-foreground">
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
        <section className="py-xl md:py-2xl px-sm md:px-xl bg-card/30 border-y border-border flex flex-col items-center">
          <div className="max-w-container-max w-full flex flex-col items-center">
            <div className="flex flex-col items-center text-center mb-lg md:mb-2xl">
              <p className="font-label-sm text-xs md:text-label-sm text-primary uppercase tracking-widest mb-sm md:mb-md">
                How It Works
              </p>
              <h2 className="font-headline text-xl md:text-headline-lg tracking-tight mb-sm text-foreground">
                Start tracking in 3 simple steps
              </h2>
              <p className="text-muted-foreground font-body-md text-sm md:text-body-md leading-relaxed max-w-xl">
                Get up and running in minutes, not days.
              </p>
            </div>

            <div className="flex flex-col md:flex-row md:flex-wrap gap-lg md:gap-lg relative justify-center w-full">
              <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              {STEPS.map((step) => {
                const IconComp = step.icon
                return (
                  <div key={step.number} className="relative text-center group inline-flex flex-col items-center w-full md:w-[calc(33.333%-1rem)]">
                    <div className="relative z-10 w-24 h-24 md:w-32 md:h-32 mb-md md:mb-lg rounded-2xl bg-card border border-border flex flex-col items-center justify-center hover:border-primary/30 transition-all duration-300">
                      <span className="font-label-sm text-xs md:text-label-sm text-primary/60 uppercase tracking-widest mb-0.5 md:mb-xs">
                        Step
                      </span>
                      <span className="font-headline text-2xl md:text-headline-lg text-foreground font-bold leading-none tracking-tight">
                        {step.number}
                      </span>
                    </div>
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-sm md:mb-md">
                      <IconComp className="w-6 h-6 md:w-7 md:h-7 text-primary" />
                    </div>
                    <h3 className="font-headline text-base md:text-headline-md tracking-tight mb-xs md:mb-sm text-foreground">
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
        <section className="py-xl md:py-2xl px-sm md:px-xl bg-card/30 border-y border-border flex flex-col items-center">
          <div className="max-w-container-max w-full flex flex-col items-center">
            <div className="flex flex-col items-center text-center mb-lg md:mb-2xl">
              <p className="font-label-sm text-xs md:text-label-sm text-primary uppercase tracking-widest mb-sm md:mb-md">
                For Teams
              </p>
              <h2 className="font-headline text-xl md:text-headline-lg tracking-tight mb-sm text-foreground">
                Built for Teams
              </h2>
              <p className="text-muted-foreground font-body-md text-sm md:text-body-md leading-relaxed max-w-xl">
                Invite clients, manage permissions, and track team expenses in one place
              </p>
            </div>

            <div className="flex flex-col md:flex-row md:flex-wrap gap-sm md:gap-lg justify-center w-full">
              {[
                { icon: Users, title: 'Client Management', desc: 'Create client accounts, assign roles, and manage access with ease', color: 'text-primary', bg: 'bg-primary/10' },
                { icon: ShieldCheck, title: 'Role-Based Access', desc: 'Managers get full control, clients see only their own data', color: 'text-secondary', bg: 'bg-secondary/10' },
                { icon: Handshake, title: 'Team Collaboration', desc: 'Work together with shared categories, budgets, and real-time insights', color: 'text-primary', bg: 'bg-primary/10' },
              ].map((item) => (
                <div
                  key={item.title}
                  className="inline-flex flex-col items-center text-center p-md md:p-xl rounded-2xl bg-card border border-border w-full md:w-[calc(33.333%-1rem)] hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                >
                  <div className={`w-12 h-12 md:w-14 md:h-14 ${item.bg} rounded-2xl flex items-center justify-center mb-md md:mb-lg`}>
                    <item.icon className={`w-6 h-6 md:w-7 md:h-7 ${item.color}`} />
                  </div>
                  <h3 className="font-headline text-base md:text-headline-md tracking-tight mb-xs md:mb-sm text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground font-body-md text-sm md:text-body-md leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-center mt-lg md:mt-2xl">
              <Link
                href="/org-signup"
                className="bg-primary text-primary-foreground font-medium px-lg py-3 rounded-xl text-sm md:text-body-lg hover:brightness-110 transition-all emerald-drop inline-flex items-center justify-center gap-sm w-full sm:w-auto"
              >
                Set Up Your Team
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-xl md:py-2xl px-sm md:px-xl flex flex-col items-center" id="pricing">
          <div className="max-w-container-max w-full flex flex-col items-center">
            <div className="flex flex-col items-center text-center mb-lg md:mb-2xl">
              <p className="font-label-sm text-xs md:text-label-sm text-primary uppercase tracking-widest mb-sm md:mb-md">
                Pricing
              </p>
              <h2 className="font-headline text-xl md:text-headline-lg tracking-tight mb-sm text-foreground">
                Simple, transparent pricing
              </h2>
              <p className="text-muted-foreground font-body-md text-sm md:text-body-md leading-relaxed max-w-xl">
                Choose the plan that fits your needs.
              </p>
            </div>

            <div className="flex flex-col md:flex-row md:flex-wrap gap-sm md:gap-lg justify-center items-stretch w-full">
              {PRICING_PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative inline-flex flex-col items-center text-center p-md md:p-xl rounded-2xl w-full md:w-[calc(33.333%-1.33rem)] transition-all duration-300 ${
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
                  <span className="font-label-sm text-xs md:text-label-sm uppercase mb-sm md:mb-md text-muted-foreground">
                    {plan.name}
                  </span>
                  <div className="flex items-end justify-center gap-xs mb-xs md:mb-sm">
                    <span className="font-headline text-2xl md:text-headline-lg text-foreground">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground mb-0.5 font-body-md text-sm">{plan.period}</span>
                    )}
                  </div>
                  <p className="text-muted-foreground font-body-md text-sm md:text-body-md mb-md md:mb-lg">
                    {plan.description}
                  </p>
                  <div className="h-px bg-border mb-md md:mb-lg" />
                  <ul className="space-y-sm md:space-y-md mb-xl md:mb-2xl flex-1 w-full">
                    {plan.features.map((f) => (
                      <li key={f.text} className="flex items-center gap-sm text-sm md:text-body-md">
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
        <section className="py-xl md:py-2xl px-sm md:px-xl relative flex flex-col items-center">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-transparent to-secondary/3 pointer-events-none" />
          <div className="max-w-container-max w-full glass-card rounded-2xl md:rounded-3xl p-md md:p-2xl flex flex-col items-center text-center border border-border overflow-hidden relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-primary/8 blur-[100px] rounded-full pointer-events-none" />
            <h2 className="font-headline text-xl md:text-headline-lg lg:text-display-lg tracking-tight mb-sm md:mb-md text-foreground relative z-10">
              Ready to take control of your finances?
            </h2>
            <p className="text-muted-foreground font-body-md text-sm md:text-body-lg leading-relaxed mb-lg md:mb-xl max-w-xl relative z-10">
              Get started for free. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-sm sm:gap-md relative z-10 w-full sm:w-auto">
              <Link
                href="/signup"
                className="bg-primary text-primary-foreground font-medium px-lg py-3 rounded-xl text-sm md:text-body-lg hover:brightness-110 transition-all emerald-drop inline-flex items-center justify-center gap-sm w-full sm:w-auto"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#"
                className="border border-border text-foreground font-medium px-lg py-3 rounded-xl text-sm md:text-body-lg hover:bg-muted/50 transition-all inline-flex items-center justify-center gap-sm w-full sm:w-auto"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-card/50 border-t border-border pt-xl md:pt-2xl pb-lg md:pb-xl px-sm md:px-xl flex flex-col items-center">
        <div className="max-w-container-max w-full flex flex-col md:flex-row md:flex-wrap justify-center items-start gap-xl md:gap-2xl mb-xl md:mb-2xl">
          <div className="flex flex-col w-full md:w-auto md:min-w-[200px]">
            <span className="font-headline text-lg md:text-headline-md font-bold text-foreground block mb-sm md:mb-md tracking-tight">
              Ledgerly
            </span>
            <p className="text-muted-foreground font-body-md text-sm md:text-body-md leading-relaxed mb-lg md:mb-xl max-w-xs">
              The premium operating system for modern financial management.
            </p>
            <div className="flex gap-sm">
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
            <h4 className="font-label-sm text-xs md:text-label-sm text-foreground uppercase mb-md md:mb-lg tracking-wider">
              Product
            </h4>
            <ul className="space-y-sm text-muted-foreground font-body-md text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Changelog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
            </ul>
          </div>
          <div className="flex flex-col min-w-[120px]">
            <h4 className="font-label-sm text-xs md:text-label-sm text-foreground uppercase mb-md md:mb-lg tracking-wider">
              Company
            </h4>
            <ul className="space-y-sm text-muted-foreground font-body-md text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Legal</a></li>
            </ul>
          </div>
          <div className="flex flex-col w-full md:w-auto md:min-w-[200px]">
            <h4 className="font-label-sm text-xs md:text-label-sm text-foreground uppercase mb-md md:mb-lg tracking-wider">
              Stay Updated
            </h4>
            <p className="text-muted-foreground font-body-md text-sm md:text-body-md mb-sm">
              Get the latest product updates and financial insights.
            </p>
            <div className="flex gap-sm">
              <input
                type="email"
                placeholder="email@example.com"
                className="bg-muted/50 border border-border rounded-lg px-sm py-2 flex-1 min-w-0 focus:ring-1 focus:ring-primary focus:border-primary outline-none text-foreground placeholder:text-muted-foreground text-sm"
              />
              <button className="bg-primary text-primary-foreground py-2 px-sm rounded-lg font-medium hover:brightness-110 transition-all text-sm whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-container-max w-full flex flex-col md:flex-row justify-center items-center gap-sm md:gap-lg border-t border-border pt-lg md:pt-xl">
          <p className="text-muted-foreground font-label-sm text-xs md:text-label-sm text-center">
            &copy; {currentYear} Ledgerly Inc. All rights reserved.
          </p>
          <div className="flex gap-lg">
            <a href="#" className="text-muted-foreground font-label-sm text-xs md:text-label-sm hover:text-foreground transition-colors">Security</a>
            <a href="#" className="text-muted-foreground font-label-sm text-xs md:text-label-sm hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="text-muted-foreground font-label-sm text-xs md:text-label-sm hover:text-foreground transition-colors">Terms</a>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-xs pb-safe pt-2 md:hidden bg-card/90 backdrop-blur-lg border-t border-border">
        <a href="#" className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-xl px-3 py-1.5 transition-all duration-150">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <span className="text-[10px] mt-0.5 font-medium">Home</span>
        </a>
        <a href="#features" className="flex flex-col items-center justify-center text-muted-foreground px-3 py-1.5 active:bg-muted/50 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <span className="text-[10px] mt-0.5">Features</span>
        </a>
        <a href="#pricing" className="flex flex-col items-center justify-center text-muted-foreground px-3 py-1.5 active:bg-muted/50 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
          <span className="text-[10px] mt-0.5">Pricing</span>
        </a>
        <a href="/login" className="flex flex-col items-center justify-center text-muted-foreground px-3 py-1.5 active:bg-muted/50 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          <span className="text-[10px] mt-0.5">Settings</span>
        </a>
      </nav>
    </div>
  )
}
