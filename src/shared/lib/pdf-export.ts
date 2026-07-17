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

export async function generatePDF(
  expenses: ExportExpense[],
  userName: string,
  dateRange?: { from: Date; to: Date }
): Promise<void> {
  // Dynamic import for jsPDF
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(20)
  doc.setTextColor(78, 222, 163) // Primary color
  doc.text('Ledgerly', 14, 22)
  
  doc.setFontSize(12)
  doc.setTextColor(0)
  doc.text('Expense Report', 14, 32)
  
  // User info
  doc.setFontSize(10)
  doc.text(`Generated for: ${userName}`, 14, 42)
  doc.text(`Date: ${format(new Date(), 'MMMM d, yyyy')}`, 14, 48)
  
  if (dateRange) {
    doc.text(
      `Period: ${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`,
      14,
      54
    )
  }

  // Summary
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount_cents, 0)
  const totalTax = expenses.reduce((sum, e) => sum + (e.tax_amount_cents || 0), 0)
  
  doc.setFontSize(11)
  doc.text(`Total Expenses: $${(totalAmount / 100).toFixed(2)}`, 14, 66)
  doc.text(`Total Tax: $${(totalTax / 100).toFixed(2)}`, 14, 72)
  doc.text(`Number of Transactions: ${expenses.length}`, 14, 78)

  // Table
  const tableData = expenses.map(expense => [
    format(new Date(expense.date), 'MMM d, yyyy'),
    `$${(expense.amount_cents / 100).toFixed(2)}`,
    expense.currency,
    expense.category_name || '-',
    expense.notes || '-',
    expense.tax_applicable ? `$${(expense.tax_amount_cents || 0) / 100}` : '-',
  ])

  autoTable(doc, {
    startY: 88,
    head: [['Date', 'Amount', 'Currency', 'Category', 'Notes', 'Tax']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [78, 222, 163],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
    },
    margin: { top: 88 },
    didDrawPage: (data) => {
      // Footer with page number
      const pageCount = doc.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(128)
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      )
    },
  })

  // Save
  const filename = `ledgerly-expenses-${format(new Date(), 'yyyy-MM-dd')}.pdf`
  doc.save(filename)
}