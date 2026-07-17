'use client'

import { KpiCards } from '@/widgets/dashboard/kpi-cards'
import { SpendingTrendChart } from '@/widgets/dashboard/spending-trend-chart'
import { CategoryChart } from '@/widgets/dashboard/category-chart'
import { RecentActivity } from '@/widgets/dashboard/recent-activity'
import { Insights } from '@/widgets/dashboard/insights'
import { TaxSummary } from '@/widgets/dashboard/tax-summary'
import { CurrencySummary } from '@/widgets/dashboard/currency-summary'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">Key Performance Indicators</h2>
        <KpiCards />
      </section>

      {/* Charts Row */}
      <section aria-labelledby="charts-heading" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <h2 id="charts-heading" className="sr-only">Spending Charts</h2>
        <SpendingTrendChart />
        <CategoryChart />
      </section>

      {/* Activity & Insights Row */}
      <section aria-labelledby="activity-heading" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <h2 id="activity-heading" className="sr-only">Recent Activity and Insights</h2>
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <Insights />
      </section>

      {/* Summary Row */}
      <section aria-labelledby="summary-heading" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <h2 id="summary-heading" className="sr-only">Financial Summaries</h2>
        <TaxSummary />
        <CurrencySummary />
      </section>
    </div>
  )
}