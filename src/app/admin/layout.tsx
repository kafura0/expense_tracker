import type { Metadata } from 'next'
import { QueryProvider } from '../providers'

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Ledgerly' },
  robots: { index: false, follow: false },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <QueryProvider>{children}</QueryProvider>
}
