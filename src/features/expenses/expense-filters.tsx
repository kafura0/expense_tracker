'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { X, Search, Calendar, Tag, SlidersHorizontal, RotateCcw } from 'lucide-react'
import type { ExpenseFilters as FilterType } from '@/entities/expense/types'
import { cn } from '@/shared/lib/utils'

const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']

interface ExpenseFiltersProps {
  filters: FilterType
  onFilterChange: (filters: FilterType) => void
}

export function ExpenseFilters({ filters, onFilterChange }: ExpenseFiltersProps) {
  const [search, setSearch] = useState(filters.search || '')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ ...filters, search: search || undefined })
    }, 300)

    return () => clearTimeout(timer)
  }, [search, filters, onFilterChange])

  const handleCurrencyChange = useCallback((currency: string) => {
    onFilterChange({
      ...filters,
      currency: filters.currency === currency ? undefined : currency,
    })
  }, [filters, onFilterChange])

  const handleTaxToggle = useCallback(() => {
    onFilterChange({
      ...filters,
      tax_applicable: filters.tax_applicable === true ? undefined : true,
    })
  }, [filters, onFilterChange])

  const removeFilter = useCallback((key: keyof FilterType) => {
    onFilterChange({
      ...filters,
      [key]: undefined,
    })
    if (key === 'search') {
      setSearch('')
    }
  }, [filters, onFilterChange])

  const clearAll = useCallback(() => {
    setSearch('')
    onFilterChange({})
  }, [onFilterChange])

  const activeFilters = Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')
  const activeCount = activeFilters.length

  return (
    <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm shadow-sm">
      <div className="flex items-center gap-3 p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses by notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "gap-2 transition-all duration-200",
              expanded && "bg-accent text-accent-foreground"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeCount > 0 && (
              <Badge variant="default" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                {activeCount}
              </Badge>
            )}
          </Button>

          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(['expense', 'income'] as const).map((type) => (
                <Button
                  key={type}
                  variant={filters.entry_type === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onFilterChange({
                    ...filters,
                    entry_type: filters.entry_type === type ? undefined : type,
                  })}
                  className={cn(
                    "h-8 text-xs font-medium capitalize transition-all duration-150",
                    filters.entry_type === type ? "shadow-sm" : "hover:bg-accent"
                  )}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                Date Range
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={filters.date_from || ''}
                  onChange={(e) => onFilterChange({ ...filters, date_from: e.target.value || undefined })}
                  className="flex-1 text-sm"
                />
                <span className="text-muted-foreground text-sm">to</span>
                <Input
                  type="date"
                  value={filters.date_to || ''}
                  onChange={(e) => onFilterChange({ ...filters, date_to: e.target.value || undefined })}
                  className="flex-1 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Tag className="h-3 w-3" />
                Currency
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CURRENCIES.map((currency) => (
                  <Button
                    key={currency}
                    variant={filters.currency === currency ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleCurrencyChange(currency)}
                    className={cn(
                      "h-8 text-xs font-medium transition-all duration-150",
                      filters.currency === currency
                        ? "shadow-sm"
                        : "hover:bg-accent"
                    )}
                  >
                    {currency}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant={filters.tax_applicable === true ? 'default' : 'outline'}
              size="sm"
              onClick={handleTaxToggle}
              className={cn(
                "h-8 text-xs font-medium transition-all duration-150",
                filters.tax_applicable === true && "shadow-sm"
              )}
            >
              Tax Only
            </Button>
          </div>

          {activeCount > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {activeFilters.map(([key, value]) => (
                <Badge
                  key={key}
                  variant="secondary"
                  className="gap-1.5 pl-2.5 pr-1.5 py-1 text-xs font-medium"
                >
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="text-foreground">
                    {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                  </span>
                  <button
                    onClick={() => removeFilter(key as keyof FilterType)}
                    className="ml-0.5 p-0.5 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
