'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { LayoutDashboard, Receipt, BarChart3, Tag, Settings, LogOut, Shield, Users, Menu, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { logout } from '@/features/auth/actions'
import { cn } from '@/shared/lib/utils'
import { useOrg } from '@/shared/lib/org-provider'
import { OrgSwitcher } from '@/features/org/org-switcher'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  roles?: string[]
}

const baseNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/categories', label: 'Categories', icon: Tag },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const adminNavItems: NavItem[] = [
  { href: '/admin', label: 'Admin', icon: Shield, roles: ['super_admin'] },
]

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)
  useEffect(() => {
    ref.current = value
  }, [value])
  // eslint-disable-next-line react-hooks/refs
  return ref.current
}

function NavLinks({
  navItems,
  isActive,
  onNavigate,
}: {
  navItems: NavItem[]
  isActive: (href: string) => boolean
  onNavigate?: () => void
}) {
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative',
              active
                ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
                : 'text-sidebar-accent-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}
          >
            {active && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-sidebar-primary shadow-glow" />
            )}
            <item.icon className={cn(
              'h-5 w-5 shrink-0 transition-all duration-200',
              active ? 'text-sidebar-primary drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'text-sidebar-accent-foreground group-hover:text-sidebar-foreground'
            )} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { activeOrg, userName, userEmail } = useOrg()
  const [mobileOpen, setMobileOpen] = useState(false)

  const displayName = userName || 'User'

  const userRole = activeOrg?.role || null

  const navItems = [
    ...baseNavItems,
    ...adminNavItems.filter(item =>
      !item.roles || (userRole && item.roles.includes(userRole))
    ),
  ]

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    org_admin: 'Org Admin',
    member: 'Org Member',
  }

  const prevPathname = usePrevious(pathname)
  useEffect(() => {
    if (prevPathname !== pathname) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMobileOpen(false)
    }
  }, [pathname, prevPathname])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sidebar-primary to-emerald-400 flex items-center justify-center shadow-glow">
            <span className="text-sm font-bold text-sidebar-primary-foreground">L</span>
          </div>
          <span className="font-headline text-lg font-bold text-sidebar-foreground tracking-tight">
            Ledgerly
          </span>
        </div>

        {activeOrg && (
          <>
            <div className="px-3 py-3 border-b border-sidebar-border">
              <OrgSwitcher />
            </div>

            {userRole && (
              <div className="px-5 py-2.5 border-b border-sidebar-border">
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200',
                  userRole === 'super_admin' && 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/20',
                  userRole !== 'super_admin' && 'bg-primary/10 text-primary ring-1 ring-primary/20',
                )}>
                  {userRole === 'super_admin' && <Shield className="h-3 w-3" />}
                  {userRole !== 'super_admin' && <Users className="h-3 w-3" />}
                  {roleLabels[userRole] || userRole}
                </span>
              </div>
            )}
          </>
        )}

        <div className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-accent-foreground/50">Navigation</p>
          <NavLinks navItems={navItems} isActive={isActive} />
        </div>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-3 mb-2 bg-sidebar-accent/30 backdrop-blur-sm ring-1 ring-white/[0.04]">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sidebar-primary/20 to-sidebar-primary/5 ring-1 ring-sidebar-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-sidebar-primary">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
              <p className="text-xs text-sidebar-accent-foreground/60 truncate">{userEmail}</p>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-accent-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200 group"
            >
              <LogOut className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
                  Log out
                </button>
              </form>
            </div>
          </aside>

          {/* Mobile Overlay */}
          {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 flex flex-col bg-sidebar border-r border-sidebar-border shadow-2xl animate-[slide-in-left_0.3s_ease-out]">
            <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sidebar-primary to-emerald-400 flex items-center justify-center shadow-glow">
                  <span className="text-sm font-bold text-sidebar-primary-foreground">L</span>
                </div>
                <span className="font-headline text-lg font-bold text-sidebar-foreground tracking-tight">
                  Ledgerly
                </span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {activeOrg && (
              <>
                <div className="px-3 py-3 border-b border-sidebar-border">
                  <OrgSwitcher />
                </div>

                {userRole && (
                  <div className="px-5 py-2.5 border-b border-sidebar-border">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200',
                      userRole === 'super_admin' && 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/20',
                      userRole !== 'super_admin' && 'bg-primary/10 text-primary ring-1 ring-primary/20',
                    )}>
                      {userRole === 'super_admin' ? <Shield className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                      {roleLabels[userRole] || userRole}
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="flex-1 px-3 py-4 overflow-y-auto">
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-accent-foreground/50">Navigation</p>
              <NavLinks navItems={navItems} isActive={isActive} onNavigate={() => setMobileOpen(false)} />
            </div>

            <div className="border-t border-sidebar-border p-3">
              <div className="flex items-center gap-3 rounded-xl px-3 py-3 mb-2 bg-sidebar-accent/30 backdrop-blur-sm ring-1 ring-white/[0.04]">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sidebar-primary/20 to-sidebar-primary/5 ring-1 ring-sidebar-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-sidebar-primary">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
                  <p className="text-xs text-sidebar-accent-foreground/60 truncate">{userEmail}</p>
                </div>
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-accent-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200 group"
                >
                  <LogOut className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
                  Log out
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      {/* Main Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 rounded-lg text-foreground/70 hover:bg-accent hover:text-foreground transition-all duration-200"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center shadow-glow">
                <span className="text-[10px] font-bold text-primary-foreground">L</span>
              </div>
              <span className="font-headline text-base font-bold text-foreground tracking-tight">
                Ledgerly
              </span>
            </div>
          </div>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20 flex items-center justify-center">
            <span className="text-[10px] font-semibold text-primary">{initials}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
