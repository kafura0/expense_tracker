import { QueryProvider } from '../providers'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <QueryProvider>{children}</QueryProvider>
}
