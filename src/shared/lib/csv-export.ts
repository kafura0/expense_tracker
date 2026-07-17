import { format } from 'date-fns'

interface ExportExpense {
  date: string
  amount_cents: number
  currency: string
  category_name?: string
  notes?: string
  tax_applicable?: boolean
  tax_amount_cents?: number
}

export function generateCSV(expenses: ExportExpense[]): string {
  const headers = ['Date', 'Amount', 'Currency', 'Category', 'Notes', 'Tax Applicable', 'Tax Amount']
  
  const rows = expenses.map(expense => [
    format(new Date(expense.date), 'yyyy-MM-dd'),
    (expense.amount_cents / 100).toFixed(2),
    expense.currency,
    expense.category_name || '',
    expense.notes || '',
    expense.tax_applicable ? 'Yes' : 'No',
    expense.tax_amount_cents ? (expense.tax_amount_cents / 100).toFixed(2) : '0.00',
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  return csvContent
}

export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}