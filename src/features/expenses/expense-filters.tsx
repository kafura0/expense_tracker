'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { X, Search } from 'lucide-react'
import type { ExpenseFilters as FilterType } from '@/entities/expense/types'

const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']

interface ExpenseFiltersProps {
  filters: FilterType
  onFilterChange: (filters: FilterType) => void
}

export function ExpenseFilters({ filters, onFilterChange }: ExpenseFiltersProps) {
  const [search, setSearch] = useState(filters.search || '')

  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ ...filters, search: search || undefined })
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  const handleCurrencyChange = (currency: string) => {
    onFilterChange({
      ...filters,
      currency: filters.currency === currency ? undefined : currency,
    })
  }

  const handleTaxToggle = () => {
    onFilterChange({
      ...filters,
      tax_applicable: filters.tax_applicable === true ? undefined : true,
    })
  }

  const removeFilter = (key: keyof FilterType) => {
    onFilterChange({
      ...filters,
      [key]: undefined,
    })
    if (key === 'search') {
      setSearch('')
    }
  }

  const activeFilters = Object.entries(filters).filter(([_, value]) => value !== undefined)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1">
            {CURRENCIES.map((currency) => (
              <Button
                key={currency}
                variant={filters.currency === currency ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCurrencyChange(currency)}
              >
                {currency}
              </Button>
            ))}
          </div>

          <Button
            variant={filters.tax_applicable === true ? 'default' : 'outline'}
            size="sm"
            onClick={handleTaxToggle}
          >
            Tax Only
          </Button>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map(([key, value]) => (
            <Badge key={key} variant="secondary" className="gap-1">
              {key}: {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
              <button
                onClick={() => removeFilter(key as keyof FilterType)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}