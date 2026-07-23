'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Receipt, Settings, LogOut, Shield, Users } from 'lucide-react'
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
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const adminNavItems: NavItem[] = [
  { href: '/admin', label: 'Admin', icon: Shield, roles: ['super_admin'] },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { activeOrg } = useOrg()

  const userRole = activeOrg?.role || null

  const navItems = [
    ...baseNavItems,
    ...adminNavItems.filter(item =>
      !item.roles || (userRole && item.roles.includes(userRole))
    ),
  ]

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    manager: 'Manager',
    client: 'Client',
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-outline-variant bg-surface-container-low">
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-outline-variant">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-sm font-bold text-on-primary">L</span>
          </div>
          <span className="font-headline text-lg font-bold text-on-surface">
            Ledgerly
          </span>
        </div>

        {/* Org Switcher */}
        <div className="px-3 py-3 border-b border-outline-variant">
          <OrgSwitcher />
        </div>

        {/* Role badge */}
        {userRole && (
          <div className="px-6 py-2 border-b border-outline-variant">
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
              userRole === 'super_admin' && 'bg-purple-100 text-purple-800',
              userRole === 'manager' && 'bg-blue-100 text-blue-800',
              userRole === 'client' && 'bg-gray-100 text-gray-800',
            )}>
              {userRole === 'super_admin' && <Shield className="h-3 w-3" />}
              {userRole === 'manager' && <Users className="h-3 w-3" />}
              {roleLabels[userRole] || userRole}
            </span>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-outline-variant">
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              Log out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-on-primary">L</span>
            </div>
            <span className="font-headline text-base font-bold text-on-surface">
              Ledgerly
            </span>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </header>

        {/* Mobile org switcher */}
        <div className="md:hidden px-4 py-2 border-b border-outline-variant bg-surface-container-low">
          <OrgSwitcher />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
