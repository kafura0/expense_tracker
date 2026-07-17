'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { Button } from '@/shared/ui/button'
import { Download, FileText, Table } from 'lucide-react'
import { generateCSV, downloadCSV } from '@/shared/lib/csv-export'
import { generatePDF } from '@/shared/lib/pdf-export'
import { useToast } from '@/shared/ui/toast'

interface ExportButtonProps {
  filters?: {
    date_from?: string
    date_to?: string
    category_id?: string
    currency?: string
  }
}

export function ExportButton({ filters }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportType, setExportType] = useState<'csv' | 'pdf' | null>(null)
  const supabase = createClient()
  const { toast } = useToast()

  const fetchExpenses = async () => {
    let query = supabase
      .from('expenses')
      .select(`
        *,
        categories (name)
      `)
      .eq('is_deleted', false)
      .order('date', { ascending: false })

    if (filters?.date_from) {
      query = query.gte('date', filters.date_from)
    }
    if (filters?.date_to) {
      query = query.lte('date', filters.date_to)
    }
    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id)
    }
    if (filters?.currency) {
      query = query.eq('currency', filters.currency)
    }

    const { data, error } = await query

    if (error) throw error

    return data?.map(expense => ({
      ...expense,
      category_name: (expense.categories as any)?.name || '',
    })) || []
  }

  const handleExport = async (type: 'csv' | 'pdf') => {
    setIsExporting(true)
    setExportType(type)

    try {
      const expenses = await fetchExpenses()

      if (expenses.length === 0) {
        toast('No expenses to export', 'warning')
        return
      }

      if (type === 'csv') {
        const csv = generateCSV(expenses)
        const filename = `ledgerly-expenses-${new Date().toISOString().split('T')[0]}.csv`
        downloadCSV(csv, filename)
        toast('CSV exported successfully', 'success')
      } else {
        await generatePDF(expenses, 'User')
        toast('PDF exported successfully', 'success')
      }
    } catch (error) {
      toast('Export failed', 'error')
    } finally {
      setIsExporting(false)
      setExportType(null)
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('csv')}
        disabled={isExporting}
        className="border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary"
      >
        <Table className="h-4 w-4 mr-2" />
        {isExporting && exportType === 'csv' ? 'Exporting...' : 'CSV'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('pdf')}
        disabled={isExporting}
        className="border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary"
      >
        <FileText className="h-4 w-4 mr-2" />
        {isExporting && exportType === 'pdf' ? 'Exporting...' : 'PDF'}
      </Button>
    </div>
  )
}