"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { EmptyState } from "@/shared/ui/empty-state"
import {
  Plus,
  ShoppingCart,
  Utensils,
  Home,
  Car,
  Zap,
  Heart,
  GraduationCap,
  Plane,
  Coffee,
  Wifi,
  Shirt,
} from "lucide-react"

interface Category {
  id: string
  name: string
  icon: React.ReactNode
  budget: number
  spent: number
  color: string
}

const defaultCategories: Category[] = [
  { id: "1", name: "Shopping", icon: <ShoppingCart className="h-5 w-5" />, budget: 500, spent: 320, color: "text-violet-500" },
  { id: "2", name: "Food & Dining", icon: <Utensils className="h-5 w-5" />, budget: 400, spent: 385, color: "text-orange-500" },
  { id: "3", name: "Housing", icon: <Home className="h-5 w-5" />, budget: 1500, spent: 1500, color: "text-blue-500" },
  { id: "4", name: "Transport", icon: <Car className="h-5 w-5" />, budget: 300, spent: 180, color: "text-emerald-500" },
  { id: "5", name: "Utilities", icon: <Zap className="h-5 w-5" />, budget: 200, spent: 145, color: "text-yellow-500" },
  { id: "6", name: "Health", icon: <Heart className="h-5 w-5" />, budget: 250, spent: 90, color: "text-rose-500" },
  { id: "7", name: "Education", icon: <GraduationCap className="h-5 w-5" />, budget: 200, spent: 50, color: "text-sky-500" },
  { id: "8", name: "Travel", icon: <Plane className="h-5 w-5" />, budget: 600, spent: 420, color: "text-pink-500" },
  { id: "9", name: "Subscriptions", icon: <Coffee className="h-5 w-5" />, budget: 100, spent: 65, color: "text-amber-500" },
  { id: "10", name: "Internet", icon: <Wifi className="h-5 w-5" />, budget: 80, spent: 80, color: "text-cyan-500" },
  { id: "11", name: "Clothing", icon: <Shirt className="h-5 w-5" />, budget: 200, spent: 75, color: "text-indigo-500" },
]

export default function CategoriesPage() {
  const [categories] = useState<Category[]>(defaultCategories)

  const totalBudget = categories.reduce((acc, c) => acc + c.budget, 0)
  const totalSpent = categories.reduce((acc, c) => acc + c.spent, 0)

  if (categories.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
            <p className="text-muted-foreground">Manage your spending categories</p>
          </div>
        </div>
        <EmptyState
          icon={<ShoppingCart className="h-8 w-8" />}
          title="No categories yet"
          description="Create your first category to start tracking your budget by spending area."
          action={{ label: "Add Category", onClick: () => {} }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Manage your spending categories</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${totalBudget.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-500">${totalSpent.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-500">${(totalBudget - totalSpent).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const percentage = Math.min((category.spent / category.budget) * 100, 100)
          const isOverBudget = category.spent > category.budget
          const isAtBudget = percentage === 100

          return (
            <Card key={category.id} className="group transition-all duration-200 hover:shadow-md hover:shadow-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 ${category.color}`}>
                      {category.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{category.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        ${category.spent.toLocaleString()} of ${category.budget.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {isOverBudget ? (
                    <Badge variant="destructive">Over</Badge>
                  ) : isAtBudget ? (
                    <Badge variant="warning">At Limit</Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverBudget
                          ? "bg-destructive"
                          : isAtBudget
                            ? "bg-amber-500"
                            : percentage > 80
                              ? "bg-orange-500"
                              : "bg-primary"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-right text-xs text-muted-foreground">
                    {percentage.toFixed(0)}% used
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
