import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Request Access',
  robots: { index: false, follow: false },
}

export default function RequestAccessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
