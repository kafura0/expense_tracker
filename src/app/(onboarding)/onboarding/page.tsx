'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from '@/features/onboarding/actions'

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleComplete = async () => {
    setLoading(true)
    await completeOnboarding()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/30 selection:text-primary-foreground">
      {/* ─── NAV ─── */}
      <header className="flex justify-between items-center w-full px-10 h-16 sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-10">
          <span className="font-headline text-2xl font-bold tracking-tight">Ledgerly</span>
          <nav className="hidden md:flex gap-6 items-center">
            <a className="text-primary font-semibold border-b-2 border-primary pb-1 text-xs uppercase tracking-widest" href="#hero">Home</a>
            <a className="text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded text-xs uppercase tracking-widest" href="#features">Features</a>
            <a className="text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded text-xs uppercase tracking-widest" href="#how-it-works">How It Works</a>
            <a className="text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded text-xs uppercase tracking-widest" href="#pricing">Pricing</a>
          </nav>
        </div>
        <button
          onClick={handleComplete}
          disabled={loading}
          className="bg-primary/10 text-primary border border-primary/30 px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/20 transition-all disabled:opacity-50"
        >
          {loading ? 'Setting up...' : 'Get Started'}
        </button>
      </header>

      <main className="relative overflow-hidden">
        {/* ─── HERO ─── */}
        <section id="hero" className="hero-gradient pt-28 pb-16 px-6 md:px-10">
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card mb-8">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-xs uppercase tracking-widest text-primary font-medium">Now supporting 7 Currencies</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-headline font-bold mb-6 max-w-4xl mx-auto leading-[1.1] tracking-tight">
              Intelligence for your <span className="text-primary">business capital.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Ledgerly transforms chaotic expense data into precise strategic assets. Automated reconciliation, multi-currency mastery, and bank-grade security.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
              <button
                onClick={handleComplete}
                disabled={loading}
                className="bg-primary text-primary-foreground font-semibold px-8 py-4 rounded-xl text-lg hover:brightness-110 transition-all emerald-drop disabled:opacity-50"
              >
                {loading ? 'Setting up...' : 'Start Tracking Free'}
              </button>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="border border-border text-foreground font-medium px-8 py-4 rounded-xl text-lg hover:bg-muted transition-all"
              >
                Learn More
              </button>
            </div>

            {/* Dashboard Preview */}
            <div className="relative max-w-5xl mx-auto">
              <div className="absolute inset-0 bg-primary/10 blur-[120px] rounded-full -z-10 translate-y-20"></div>
              <div className="glass-card rounded-2xl p-2 md:p-3 shadow-2xl overflow-hidden border border-border/50">
                <div className="bg-surface-dim rounded-xl border border-border/30 overflow-hidden shadow-inner">
                  <div className="h-8 bg-surface-container-low border-b border-border/30 flex items-center px-4 gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-tertiary"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                  </div>
                  <div className="p-6 md:p-10">
                    <div className="w-full aspect-[16/9] bg-surface-container-high rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <span className="material-symbols-outlined text-primary text-6xl mb-4">dashboard</span>
                        <p className="text-muted-foreground text-sm">Your expense dashboard awaits</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FEATURES BENTO GRID ─── */}
        <section id="features" className="py-24 px-6 md:px-10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-headline font-semibold mb-3">Engineered for Precision</h2>
              <p className="text-muted-foreground text-base">Tools built for the modern financial operator.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Smart Expense Tracking */}
              <div className="md:col-span-7 glass-card p-8 rounded-2xl border border-border/30 flex flex-col justify-between group hover:border-primary/50 transition-all duration-300">
                <div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
                  </div>
                  <h3 className="text-xl font-headline font-semibold mb-3">Smart Expense Tracking</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">Log expenses with auto-categorization, duplicate detection, undo deletes, and rich notes. Supports 7 currencies out of the box.</p>
                </div>
                <div className="mt-8 h-48 bg-surface-container-high rounded-xl overflow-hidden relative border border-border/20 flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-3 w-full p-4">
                    <div className="bg-surface-container rounded-lg p-3 border border-border/20">
                      <p className="text-[11px] uppercase tracking-widest text-primary mb-1 font-medium">Today</p>
                      <p className="text-lg font-headline font-semibold">$1,240</p>
                    </div>
                    <div className="bg-surface-container rounded-lg p-3 border border-border/20">
                      <p className="text-[11px] uppercase tracking-widest text-primary mb-1 font-medium">This Week</p>
                      <p className="text-lg font-headline font-semibold">$4,890</p>
                    </div>
                    <div className="bg-surface-container rounded-lg p-3 border border-border/20">
                      <p className="text-[11px] uppercase tracking-widest text-primary mb-1 font-medium">This Month</p>
                      <p className="text-lg font-headline font-semibold">$18,320</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* VAT Calculation */}
              <div className="md:col-span-5 glass-card p-8 rounded-2xl border border-border/30 group hover:border-primary/50 transition-all">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-primary">calculate</span>
                </div>
                <h3 className="text-xl font-headline font-semibold mb-3">VAT Calculations</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-8">Automatic tax extraction and VAT compliance across jurisdictions.</p>
                <div className="bg-surface-container rounded-lg p-4 font-mono text-xs border border-border/20">
                  <div className="flex justify-between text-muted-foreground border-b border-border/10 pb-2 mb-2">
                    <span>NET AMOUNT</span>
                    <span className="text-foreground">$1,240.00</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground border-b border-border/10 pb-2 mb-2">
                    <span>VAT (16%)</span>
                    <span className="text-primary">+$198.40</span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground">
                    <span>TOTAL</span>
                    <span>$1,438.40</span>
                  </div>
                </div>
              </div>

              {/* Multi-currency */}
              <div className="md:col-span-5 glass-card p-8 rounded-2xl border border-border/30 group hover:border-primary/50 transition-all">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-primary">currency_exchange</span>
                </div>
                <h3 className="text-xl font-headline font-semibold mb-3">Multi-Currency</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Real-time spot rates from the European Central Bank. KES, USD, EUR, GBP, CAD, AUD, and JPY.</p>
              </div>

              {/* Analytics */}
              <div className="md:col-span-7 glass-card p-8 rounded-2xl border border-border/30 group hover:border-primary/50 transition-all">
                <div className="flex flex-col md:flex-row md:items-center gap-8 h-full">
                  <div className="flex-1">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                      <span className="material-symbols-outlined text-primary">analytics</span>
                    </div>
                    <h3 className="text-xl font-headline font-semibold mb-3">Analytics Dashboard</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">Interactive charts: spending trends, category breakdowns, KPI cards, monthly comparisons, and tax summaries.</p>
                  </div>
                  <div className="flex-1 flex justify-center items-center">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="w-16 h-16 bg-surface-container rounded-lg border border-border/30 flex items-center justify-center hover:border-primary/50 transition-all cursor-pointer">
                        <span className="material-symbols-outlined text-primary">bar_chart</span>
                      </div>
                      <div className="w-16 h-16 bg-surface-container rounded-lg border border-border/30 flex items-center justify-center hover:border-primary/50 transition-all cursor-pointer">
                        <span className="material-symbols-outlined text-primary">pie_chart</span>
                      </div>
                      <div className="w-16 h-16 bg-surface-container rounded-lg border border-border/30 flex items-center justify-center hover:border-primary/50 transition-all cursor-pointer">
                        <span className="material-symbols-outlined text-primary">show_chart</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Export */}
              <div className="md:col-span-6 glass-card p-8 rounded-2xl border border-border/30 group hover:border-primary/50 transition-all">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-primary">download</span>
                </div>
                <h3 className="text-xl font-headline font-semibold mb-3">Export CSV & PDF</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Generate professional reports filtered by date, category, or currency. Perfect for accountants and tax filing.</p>
              </div>

              {/* PWA */}
              <div className="md:col-span-6 glass-card p-8 rounded-2xl border border-border/30 group hover:border-primary/50 transition-all">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-primary">phone_android</span>
                </div>
                <h3 className="text-xl font-headline font-semibold mb-3">Progressive Web App</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Install on your phone or desktop. Works offline and feels like a native app. No app store needed.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section id="how-it-works" className="py-24 bg-muted/30 overflow-hidden border-y border-border">
          <div className="max-w-6xl mx-auto px-6 md:px-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-headline font-semibold mb-3">How It Works</h2>
              <p className="text-muted-foreground text-base">Three steps to expense clarity.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { num: '01', title: 'Add your expenses', desc: 'Log expenses manually or import from CSV. Categorize with smart defaults and add notes.', icon: 'add_card' },
                { num: '02', title: 'Analyze & track', desc: 'See your spending patterns with real-time charts, tax summaries, and multi-currency views.', icon: 'insights' },
                { num: '03', title: 'Export & report', desc: 'Generate professional CSV or PDF reports filtered by any dimension. Ready for your accountant.', icon: 'picture_as_pdf' },
              ].map(({ num, title, desc, icon }) => (
                <div key={num} className="p-8 rounded-2xl bg-card border border-border/30 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
                    <span className="material-symbols-outlined text-primary text-3xl">{icon}</span>
                  </div>
                  <span className="text-xs uppercase tracking-widest text-primary font-medium block mb-3">Step {num}</span>
                  <h3 className="text-xl font-headline font-semibold mb-3">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── BENEFITS ─── */}
        <section className="py-24 px-6 md:px-10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-headline font-semibold mb-3">Why Teams Choose Ledgerly</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: 'schedule', title: 'Save 5+ hours per month', desc: 'Automated categorization, tax calculation, and report generation eliminate manual spreadsheet work.' },
                { icon: 'shield', title: 'Enterprise-grade security', desc: 'Row-level security, encrypted data at rest, rate limiting, and audit logging protect your financial data.' },
                { icon: 'group', title: 'Multi-tenant team access', desc: 'Role-based access for managers, clients, and admins. Each person sees only what they need.' },
                { icon: 'download', title: 'Your data, your format', desc: 'Export anytime to CSV or PDF. No lock-in. Your financial data is always accessible and portable.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex gap-4 p-8 rounded-2xl bg-card border border-border/30">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">{icon}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-headline font-semibold mb-2">{title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PRICING ─── */}
        <section id="pricing" className="py-24 px-6 md:px-10 bg-muted/30 border-y border-border">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-headline font-semibold mb-3">Transparent Scaling</h2>
              <p className="text-muted-foreground text-base">Choose the workspace that fits your volume.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Starter */}
              <div className="p-8 rounded-2xl border border-border/30 bg-card flex flex-col hover:border-muted-foreground/30 transition-all">
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">Starter</span>
                <div className="flex items-end gap-2 mb-8">
                  <span className="text-3xl font-headline font-bold">$0</span>
                  <span className="text-muted-foreground text-sm mb-1">/mo</span>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                  <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-primary text-base">check_circle</span> 1 team member</li>
                  <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-primary text-base">check_circle</span> 50 expenses/month</li>
                  <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-primary text-base">check_circle</span> CSV export</li>
                  <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-primary text-base">check_circle</span> Basic categories</li>
                </ul>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="w-full border border-border py-3 rounded-xl font-medium text-sm hover:bg-muted transition-all disabled:opacity-50"
                >
                  Start for free
                </button>
              </div>

              {/* Professional */}
              <div className="p-8 rounded-2xl border-2 border-primary bg-card flex flex-col relative shadow-[0_0_40px_rgba(78,222,163,0.08)]">
                <div className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Most Popular</div>
                <span className="text-xs uppercase tracking-widest text-primary font-medium mb-4">Professional</span>
                <div className="flex items-end gap-2 mb-8">
                  <span className="text-3xl font-headline font-bold">$9.99</span>
                  <span className="text-muted-foreground text-sm mb-1">/mo</span>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                  <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-primary text-base">check_circle</span> 10 team members</li>
                  <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-primary text-base">check_circle</span> Unlimited expenses</li>
                  <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-primary text-base">check_circle</span> CSV + PDF export</li>
                  <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-primary text-base">check_circle</span> Multi-currency</li>
                  <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-primary text-base">check_circle</span> Analytics & insights</li>
                  <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-primary text-base">check_circle</span> Tax/VAT engine</li>
                </ul>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm hover:brightness-110 transition-all disabled:opacity-50"
                >
                  Go Professional
                </button>
              </div>

              {/* Enterprise */}
              <div className="p-8 rounded-2xl border border-border/30 bg-card flex flex-col hover:border-muted-foreground/30 transition-all">
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">Enterprise</span>
                <div className="flex items-end gap-2 mb-8">
                  <span className="text-3xl font-headline font-bold">$29.99</span>
                  <span className="text-muted-foreground text-sm mb-1">/mo</span>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                  <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-primary text-base">check_circle</span> Unlimited members</li>
                  <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-primary text-base">check_circle</span> Unlimited expenses</li>
                  <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-primary text-base">check_circle</span> All export formats</li>
                  <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-primary text-base">check_circle</span> API access</li>
                  <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-primary text-base">check_circle</span> Priority support</li>
                </ul>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="w-full border border-border py-3 rounded-xl font-medium text-sm hover:bg-muted transition-all disabled:opacity-50"
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-24 px-6 md:px-10 relative">
          <div className="max-w-6xl mx-auto glass-card rounded-3xl p-12 text-center border border-primary/20 overflow-hidden">
            <h2 className="text-4xl md:text-5xl font-headline font-bold mb-4 tracking-tight">Ready to track smarter?</h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto leading-relaxed">Join businesses managing their expenses with absolute clarity.</p>
            <button
              onClick={handleComplete}
              disabled={loading}
              className="bg-primary text-primary-foreground font-semibold px-10 py-4 rounded-xl text-lg hover:brightness-110 transition-all emerald-drop disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Deploy Ledgerly'}
            </button>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="bg-muted/20 border-t border-border pt-16 pb-8 px-6 md:px-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
          <div className="md:col-span-4">
            <span className="text-xl font-headline font-bold block mb-4">Ledgerly</span>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">The premium expense intelligence platform for modern finance teams.</p>
            <div className="flex gap-3">
              <a className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-all" href="#">
                <span className="material-symbols-outlined text-sm">public</span>
              </a>
              <a className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-all" href="#">
                <span className="material-symbols-outlined text-sm">share</span>
              </a>
            </div>
          </div>
          <div className="md:col-span-2">
            <h4 className="text-xs uppercase tracking-widest font-medium mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a className="hover:text-primary transition-colors" href="#">Changelog</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Documentation</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Integrations</a></li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <h4 className="text-xs uppercase tracking-widest font-medium mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a className="hover:text-primary transition-colors" href="#">About</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Careers</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Legal</a></li>
            </ul>
          </div>
          <div className="md:col-span-4">
            <h4 className="text-xs uppercase tracking-widest font-medium mb-4">Subscribe to Updates</h4>
            <div className="flex gap-2">
              <input className="bg-card border border-border rounded-lg px-4 py-2 flex-1 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder:text-muted-foreground" placeholder="email@example.com" type="email" />
              <button className="bg-foreground text-background py-2 px-5 rounded-lg font-medium text-sm hover:opacity-90 transition-all">Join</button>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center border-t border-border/50 pt-6">
          <p className="text-muted-foreground text-xs">&copy; 2026 Ledgerly. All rights reserved.</p>
          <div className="flex gap-8 mt-4 md:mt-0">
            <a className="text-muted-foreground text-xs hover:text-foreground" href="#">Security</a>
            <a className="text-muted-foreground text-xs hover:text-foreground" href="#">Privacy Policy</a>
            <a className="text-muted-foreground text-xs hover:text-foreground" href="#">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
