import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Your Team',
  robots: { index: false, follow: false },
}

export default function OrgSignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
