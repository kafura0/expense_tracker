'use client'

import { useDashboardScope } from '@/features/dashboard/scope'
import { SoloDashboard } from '@/widgets/dashboard/solo-dashboard'
import { OrgDashboard } from '@/widgets/dashboard/org-dashboard'
import { PlatformAdminDashboard } from '@/widgets/dashboard/platform-admin-dashboard'
import { Skeleton } from '@/shared/ui/skeleton'

export default function DashboardPage() {
  const { scope, loading } = useDashboardScope()

  if (loading || !scope) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-72 bg-muted rounded-md" />
          <Skeleton className="h-4 w-48 bg-muted rounded-md mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-muted" />
          ))}
        </div>
        <Skeleton className="h-[300px] w-full rounded-xl bg-muted" />
      </div>
    )
  }

  switch (scope.persona) {
    case 'solo':
      return <SoloDashboard scope={scope} />
    case 'org':
      return <OrgDashboard scope={scope} />
    case 'platform-admin':
      return <PlatformAdminDashboard scope={scope} />
  }
}
