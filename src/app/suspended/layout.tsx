import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Account Suspended',
  robots: { index: false, follow: false },
}

export default function SuspendedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
