'use client'

import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { RefreshCw } from 'lucide-react'
import { useToast } from '@/shared/ui/toast'

export function RefreshRatesButton() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  const handleRefresh = async () => {
    setIsRefreshing(true)

    try {
      const response = await fetch('/api/rates?base=USD')
      
      if (!response.ok) {
        throw new Error('Failed to refresh rates')
      }

      toast('Exchange rates refreshed', 'success')
    } catch (error) {
      toast('Failed to refresh exchange rates', 'error')
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
      Refresh Rates
    </Button>
  )
}