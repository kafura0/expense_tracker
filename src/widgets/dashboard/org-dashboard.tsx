'use client'

import dynamic from 'next/dynamic'
import { DashboardHeader } from '@/widgets/dashboard/dashboard-header'
import { OrgHealthCard } from '@/widgets/dashboard/org-health-card'
import { KpiCards } from '@/widgets/dashboard/kpi-cards'
import { BudgetSummary } from '@/widgets/dashboard/budget-summary'
import { RecentActivity } from '@/widgets/dashboard/recent-activity'
import { Insights } from '@/widgets/dashboard/insights'
import { TeamSpendLeaderboard } from '@/widgets/dashboard/team-spend-leaderboard'
import { AnnouncementBanner } from '@/widgets/dashboard/announcement-banner'
import { Skeleton } from '@/shared/ui/skeleton'
import type { DashboardScope } from '@/features/dashboard/scope'

const SpendingTrendChart = dynamic(
  () => import('@/widgets/dashboard/spending-trend-chart').then((m) => m.SpendingTrendChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl bg-muted" />,
  }
)

const CategoryChart = dynamic(
  () => import('@/widgets/dashboard/category-chart').then((m) => m.CategoryChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-72 w-full rounded-xl bg-muted" />,
  }
)

export function OrgDashboard({ scope, orgName }: { scope: DashboardScope; orgName?: string }) {
  return (
    <div className="space-y-6">
      <AnnouncementBanner scope={scope} />
      <DashboardHeader subtitle="Organization spending at a glance" />
      <OrgHealthCard scope={scope} orgName={orgName} />
      <KpiCards scope={scope} />
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SpendingTrendChart scope={scope} />
        </div>
        <BudgetSummary scope={scope} />
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity scope={scope} />
        </div>
        <TeamSpendLeaderboard scope={scope} />
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CategoryChart scope={scope} />
        </div>
        <Insights scope={scope} />
      </section>
    </div>
  )
}
