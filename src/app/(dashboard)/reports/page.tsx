"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { EmptyState } from "@/shared/ui/empty-state"
import {
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

const summaryCards = [
  { label: "Total Income", value: "$8,450.00", change: "+12.5%", trend: "up" as const, icon: <TrendingUp className="h-5 w-5 text-emerald-500" /> },
  { label: "Total Expenses", value: "$5,230.00", change: "-3.2%", trend: "down" as const, icon: <TrendingDown className="h-5 w-5 text-rose-500" /> },
  { label: "Net Savings", value: "$3,220.00", change: "+28.1%", trend: "up" as const, icon: <DollarSign className="h-5 w-5 text-primary" /> },
  { label: "Avg. Daily Spend", value: "$174.33", change: "-5.7%", trend: "down" as const, icon: <BarChart3 className="h-5 w-5 text-sky-500" /> },
]

const monthlyData = [
  { month: "Jan", income: 7200, expenses: 4800 },
  { month: "Feb", income: 7500, expenses: 5100 },
  { month: "Mar", income: 7800, expenses: 4900 },
  { month: "Apr", income: 8100, expenses: 5400 },
  { month: "May", income: 8450, expenses: 5230 },
]

const topCategories = [
  { name: "Housing", amount: 1500, percentage: 28.7, color: "bg-blue-500" },
  { name: "Food & Dining", amount: 385, percentage: 7.4, color: "bg-orange-500" },
  { name: "Travel", amount: 420, percentage: 8.0, color: "bg-pink-500" },
  { name: "Shopping", amount: 320, percentage: 6.1, color: "bg-violet-500" },
  { name: "Transport", amount: 180, percentage: 3.4, color: "bg-emerald-500" },
]

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<"week" | "month" | "quarter" | "year">("month")
  const [hasData] = useState(true)

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">Analyze your spending patterns</p>
          </div>
        </div>
        <EmptyState
          icon={<BarChart3 className="h-8 w-8" />}
          title="No reports available"
          description="Start tracking your expenses to see detailed reports and spending insights."
          action={{ label: "Add Expense", href: "/expenses" }}
        />
      </div>
    )
  }

  const maxExpenses = Math.max(...monthlyData.map((d) => d.expenses))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Analyze your spending patterns</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border bg-muted/50 p-1">
            {(["week", "month", "quarter", "year"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                  dateRange === range
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
              <div className="mt-1 flex items-center gap-1">
                {card.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-rose-500" />
                )}
                <span
                  className={`text-xs font-medium ${
                    card.trend === "up" ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {card.change}
                </span>
                <span className="text-xs text-muted-foreground">vs last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Monthly Overview</CardTitle>
              <Badge variant="secondary">
                <Calendar className="mr-1 h-3 w-3" />
                Last 5 months
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyData.map((data) => (
                <div key={data.month} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{data.month}</span>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        ${data.income.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        ${data.expenses.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <div
                      className="h-3 rounded-l-full bg-emerald-500/80 transition-all duration-500"
                      style={{ width: `${(data.income / (maxExpenses * 1.6)) * 100}%` }}
                    />
                    <div
                      className="h-3 rounded-r-full bg-rose-500/80 transition-all duration-500"
                      style={{ width: `${(data.expenses / (maxExpenses * 1.6)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Top Categories</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCategories.map((cat) => (
                <div key={cat.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${cat.color}`} />
                      <span>{cat.name}</span>
                    </div>
                    <span className="font-medium">${cat.amount.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${cat.color}`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
