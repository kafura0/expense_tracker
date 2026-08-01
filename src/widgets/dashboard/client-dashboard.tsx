'use client'

import { DashboardHeader } from '@/widgets/dashboard/dashboard-header'
import { KpiCards } from '@/widgets/dashboard/kpi-cards'
import { SpendingTrendChart } from '@/widgets/dashboard/spending-trend-chart'
import { CategoryChart } from '@/widgets/dashboard/category-chart'
import { BudgetSummary } from '@/widgets/dashboard/budget-summary'
import { RecentActivity } from '@/widgets/dashboard/recent-activity'
import { Insights } from '@/widgets/dashboard/insights'
import { TaxSummary } from '@/widgets/dashboard/tax-summary'
import { CurrencySummary } from '@/widgets/dashboard/currency-summary'
import { AnnouncementBanner } from '@/widgets/dashboard/announcement-banner'
import type { DashboardScope } from '@/features/dashboard/scope'

export function ClientDashboard({ scope }: { scope: DashboardScope }) {
  return (
    <div className="space-y-6">
      <AnnouncementBanner scope={scope} />
      <DashboardHeader subtitle="Your personal spending in the organization" />
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
        <Insights scope={scope} />
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CategoryChart scope={scope} />
        <TaxSummary scope={scope} />
        <CurrencySummary scope={scope} />
      </section>
    </div>
  )
}
