import { Expense, Category } from '@/types/expense'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { format } from 'date-fns'

export type ExportFormat = 'csv' | 'json' | 'pdf'

export interface ExportFilterOptions {
  dateFrom: string
  dateTo: string
  categories: Category[]
}

export function filterExpensesForExport(
  expenses: Expense[],
  options: ExportFilterOptions
): Expense[] {
  return expenses.filter((expense) => {
    if (options.categories.length > 0 && !options.categories.includes(expense.category)) {
      return false
    }
    if (options.dateFrom && expense.date < options.dateFrom) return false
    if (options.dateTo && expense.date > options.dateTo) return false
    return true
  })
}

export function exportToCSV(expenses: Expense[], filename: string): void {
  const headers = ['Date', 'Description', 'Category', 'Amount']
  const rows = expenses.map((e) => [
    e.date,
    `"${e.description.replace(/"/g, '""')}"`,
    e.category,
    e.amount.toFixed(2),
  ])
  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  triggerDownload(`${filename}.csv`, csvContent, 'text/csv;charset=utf-8;')
}

export function exportToJSON(expenses: Expense[], filename: string): void {
  const data = {
    exportedAt: new Date().toISOString(),
    totalRecords: expenses.length,
    totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
    expenses,
  }
  triggerDownload(`${filename}.json`, JSON.stringify(data, null, 2), 'application/json')
}

export async function exportToPDF(expenses: Expense[], filename: string): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()

  // Header branding
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(55, 48, 163)
  doc.text('SpendWise', 14, 22)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Expense Report', 14, 30)

  // Metadata
  doc.setFontSize(9)
  doc.setTextColor(148, 163, 184)
  doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy · h:mm a')}`, 14, 40)

  // Summary box
  const total = expenses.reduce((sum, e) => sum + e.amount, 0)
  doc.setFillColor(238, 242, 255)
  doc.roundedRect(14, 46, 182, 18, 3, 3, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(55, 48, 163)
  doc.text(`${expenses.length} Records`, 22, 57)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.text('·', 65, 57)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(55, 48, 163)
  doc.text(`Total: ${formatCurrency(total)}`, 70, 57)

  // Table
  autoTable(doc, {
    startY: 72,
    head: [['Date', 'Description', 'Category', 'Amount']],
    body: expenses.map((e) => [
      formatDate(e.date),
      e.description,
      e.category,
      formatCurrency(e.amount),
    ]),
    foot: [['', '', 'TOTAL', formatCurrency(total)]],
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: [238, 242, 255],
      textColor: [55, 48, 163],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 30 },
      3: { halign: 'right', cellWidth: 32 },
    },
  })

  doc.save(`${filename}.pdf`)
}

function triggerDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
