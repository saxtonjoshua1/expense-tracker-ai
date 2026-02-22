'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  X,
  Download,
  FileText,
  FileJson,
  FileBadge,
  Calendar,
  Tag,
  CheckSquare,
  Square,
  Loader2,
  Check,
  AlertCircle,
  FileX,
} from 'lucide-react'
import { format } from 'date-fns'
import { Expense, Category, CATEGORIES } from '@/types/expense'
import { formatCurrency, formatDate } from '@/utils/formatters'
import {
  filterExpensesForExport,
  exportToCSV,
  exportToJSON,
  exportToPDF,
  ExportFormat,
} from '@/utils/exportUtils'
import Badge from '@/components/ui/Badge'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  expenses: Expense[]
}

const FORMAT_OPTIONS: {
  id: ExportFormat
  label: string
  description: string
  icon: React.ElementType
  activeClasses: string
  checkClasses: string
}[] = [
  {
    id: 'csv',
    label: 'CSV',
    description: 'Spreadsheet compatible',
    icon: FileText,
    activeClasses: 'border-green-300 bg-green-50',
    checkClasses: 'bg-green-100 border-green-300 text-green-700',
  },
  {
    id: 'json',
    label: 'JSON',
    description: 'Developer friendly',
    icon: FileJson,
    activeClasses: 'border-blue-300 bg-blue-50',
    checkClasses: 'bg-blue-100 border-blue-300 text-blue-700',
  },
  {
    id: 'pdf',
    label: 'PDF',
    description: 'Print-ready report',
    icon: FileBadge,
    activeClasses: 'border-red-300 bg-red-50',
    checkClasses: 'bg-red-100 border-red-300 text-red-700',
  },
]

type ExportState = 'idle' | 'loading' | 'success' | 'error'

export default function ExportModal({ isOpen, onClose, expenses }: ExportModalProps) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([...CATEGORIES])
  const [selectedFormats, setSelectedFormats] = useState<ExportFormat[]>(['csv'])
  const [filename, setFilename] = useState(`expenses-${format(new Date(), 'yyyy-MM-dd')}`)
  const [exportState, setExportState] = useState<ExportState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (isOpen) {
      setExportState('idle')
      setErrorMsg('')
    }
  }, [isOpen])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const filteredExpenses = useMemo(
    () => filterExpensesForExport(expenses, { dateFrom, dateTo, categories: selectedCategories }),
    [expenses, dateFrom, dateTo, selectedCategories]
  )

  const totalAmount = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  )

  const previewRows = filteredExpenses.slice(0, 8)
  const allCategoriesSelected = selectedCategories.length === CATEGORIES.length

  function toggleCategory(cat: Category) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  function toggleAllCategories() {
    setSelectedCategories((prev) =>
      prev.length === CATEGORIES.length ? [] : [...CATEGORIES]
    )
  }

  function toggleFormat(fmt: ExportFormat) {
    setSelectedFormats((prev) =>
      prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt]
    )
  }

  async function handleExport() {
    if (filteredExpenses.length === 0 || selectedFormats.length === 0) return
    setExportState('loading')
    try {
      const cleanFilename = filename.trim() || 'expense-export'
      for (const fmt of selectedFormats) {
        if (fmt === 'csv') exportToCSV(filteredExpenses, cleanFilename)
        if (fmt === 'json') exportToJSON(filteredExpenses, cleanFilename)
        if (fmt === 'pdf') await exportToPDF(filteredExpenses, cleanFilename)
      }
      setExportState('success')
      setTimeout(() => {
        onClose()
        setExportState('idle')
      }, 1800)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Export failed. Please try again.')
      setExportState('error')
    }
  }

  const canExport =
    filteredExpenses.length > 0 &&
    selectedFormats.length > 0 &&
    exportState !== 'loading' &&
    exportState !== 'success'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Panel */}
      <div className="relative z-10 w-full max-w-5xl max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
              <Download size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Export Expenses</h2>
              <p className="text-xs text-slate-400">Configure filters, formats, and preview before downloading</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body (two columns) ── */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* LEFT: Config Panel */}
          <div className="w-72 border-r border-slate-100 overflow-y-auto shrink-0 flex flex-col gap-6 p-5">

            {/* Date Range */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={13} className="text-slate-400" />
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Range</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => { setDateFrom(''); setDateTo('') }}
                    className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                  >
                    Clear date range
                  </button>
                )}
              </div>
            </section>

            {/* Categories */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag size={13} className="text-slate-400" />
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Categories</h3>
                </div>
                <button
                  onClick={toggleAllCategories}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {allCategoriesSelected ? 'None' : 'All'}
                </button>
              </div>
              <div className="space-y-1">
                {CATEGORIES.map((cat) => {
                  const selected = selectedCategories.includes(cat)
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                        selected
                          ? 'bg-indigo-50 text-indigo-900'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {selected ? (
                        <CheckSquare size={15} className="text-indigo-500 shrink-0" />
                      ) : (
                        <Square size={15} className="text-slate-300 shrink-0" />
                      )}
                      <span className="font-medium">{cat}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Export Format */}
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Export Format
              </h3>
              <div className="space-y-2">
                {FORMAT_OPTIONS.map((fmt) => {
                  const selected = selectedFormats.includes(fmt.id)
                  const Icon = fmt.icon
                  return (
                    <button
                      key={fmt.id}
                      onClick={() => toggleFormat(fmt.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                        selected
                          ? fmt.activeClasses
                          : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      <Icon
                        size={18}
                        className={selected ? fmt.checkClasses.split(' ')[2] : 'text-slate-400'}
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold ${selected ? fmt.checkClasses.split(' ')[2] : 'text-slate-700'}`}>
                          {fmt.label}
                        </div>
                        <div className="text-xs text-slate-400">{fmt.description}</div>
                      </div>
                      {selected && (
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${fmt.checkClasses}`}>
                          <Check size={11} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Custom Filename */}
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Filename
              </h3>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="expense-export"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                Extension (
                {selectedFormats.length > 0
                  ? selectedFormats.map((f) => `.${f}`).join(', ')
                  : 'none'}
                ) added automatically
              </p>
            </section>
          </div>

          {/* RIGHT: Preview Panel */}
          <div className="flex-1 overflow-hidden flex flex-col p-5 min-w-0">

            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-3 mb-5 shrink-0">
              {[
                { label: 'Records', value: filteredExpenses.length.toString() },
                { label: 'Total', value: formatCurrency(totalAmount) },
                { label: 'Categories', value: `${selectedCategories.length} / ${CATEGORIES.length}` },
                { label: 'Formats', value: selectedFormats.length === 0 ? 'None' : selectedFormats.map(f => f.toUpperCase()).join('+') },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 px-4 py-3 text-center"
                >
                  <div className="text-lg font-bold text-indigo-900 truncate">{stat.value}</div>
                  <div className="text-xs text-indigo-500 font-medium mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Preview label */}
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h3 className="text-sm font-semibold text-slate-700">
                Data Preview
                {filteredExpenses.length > 8 && (
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    — first 8 of {filteredExpenses.length} records shown
                  </span>
                )}
              </h3>
            </div>

            {/* Preview table */}
            {filteredExpenses.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 rounded-xl border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <FileX size={20} className="text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">No data matches your filters</p>
                <p className="text-xs mt-1 text-slate-400">Adjust the date range or select more categories</p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto rounded-xl border border-slate-100 min-h-0">
                <table className="w-full text-sm">
                  <thead className="sticky top-0">
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        Date
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {previewRows.map((expense) => (
                      <tr key={expense.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                          {formatDate(expense.date)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-800 font-medium max-w-[200px] truncate">
                          {expense.description}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge category={expense.category} />
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-900 whitespace-nowrap">
                          {formatCurrency(expense.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50/60">
                      <td colSpan={3} className="px-3 py-2.5 text-xs font-semibold text-slate-500">
                        {filteredExpenses.length} record{filteredExpenses.length !== 1 ? 's' : ''} total
                        {filteredExpenses.length > 8 && ' · showing first 8'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex items-center gap-4 shrink-0">

          {/* Status message */}
          <div className="flex-1 min-w-0">
            {exportState === 'error' && (
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle size={14} className="shrink-0" />
                {errorMsg}
              </p>
            )}
            {exportState === 'success' && (
              <p className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <Check size={14} className="shrink-0" />
                Export complete! Your file{selectedFormats.length > 1 ? 's have' : ' has'} been downloaded.
              </p>
            )}
            {exportState === 'idle' && (
              <p className="text-xs text-slate-400 truncate">
                {filteredExpenses.length > 0
                  ? `${filteredExpenses.length} record${filteredExpenses.length !== 1 ? 's' : ''} · ${formatCurrency(totalAmount)} · ready to export`
                  : 'No records match current filters'}
              </p>
            )}
            {exportState === 'loading' && (
              <p className="text-xs text-indigo-500">Generating export files…</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={!canExport}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all shadow-sm ${
                filteredExpenses.length === 0 || selectedFormats.length === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                  : exportState === 'loading'
                  ? 'bg-indigo-400 text-white cursor-wait'
                  : exportState === 'success'
                  ? 'bg-green-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {exportState === 'loading' ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Exporting…
                </>
              ) : exportState === 'success' ? (
                <>
                  <Check size={15} />
                  Done!
                </>
              ) : (
                <>
                  <Download size={15} />
                  Export
                  {filteredExpenses.length > 0 && ` ${filteredExpenses.length} Record${filteredExpenses.length !== 1 ? 's' : ''}`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
