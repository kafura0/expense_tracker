import type { Metadata } from 'next'
import { Providers } from '../providers'
import { DashboardShell } from './dashboard-shell'
import { PageTransition } from '@/shared/ui/page-transition'

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s | Ledgerly' },
  robots: { index: false, follow: false },
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <DashboardShell>
        <PageTransition>{children}</PageTransition>
      </DashboardShell>
    </Providers>
  )
}
