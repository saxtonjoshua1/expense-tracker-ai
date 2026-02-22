'use client'

import { useState } from 'react'
import { Plus, Download, FileX } from 'lucide-react'
import { Expense, ExpenseFormData, FilterState } from '@/types/expense'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import FilterBar from './FilterBar'
import ExpenseForm from './ExpenseForm'
import ExpenseItem from './ExpenseItem'
import ExportModal from '@/components/export/ExportModal'
import { formatCurrency } from '@/utils/formatters'

interface ExpenseListProps {
  expenses: Expense[]
  filteredExpenses: Expense[]
  filters: FilterState
  onFiltersChange: (f: FilterState) => void
  onAdd: (data: ExpenseFormData) => void
  onUpdate: (id: string, data: ExpenseFormData) => void
  onDelete: (id: string) => void
}

export default function ExpenseList({
  expenses,
  filteredExpenses,
  filters,
  onFiltersChange,
  onAdd,
  onUpdate,
  onDelete,
}: ExpenseListProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  function handleAdd(data: ExpenseFormData) {
    onAdd(data)
    setAddOpen(false)
  }

  const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <>
      {/* Top actions */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setExportOpen(true)}
          disabled={expenses.length === 0}
        >
          <Download size={14} /> Export
        </Button>
        <div className="ml-auto">
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add Expense
          </Button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onChange={onFiltersChange} />

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileX size={40} className="mb-3 opacity-50" />
            <p className="text-sm font-medium">
              {expenses.length === 0 ? 'No expenses yet' : 'No expenses match your filters'}
            </p>
            {expenses.length === 0 && (
              <button
                onClick={() => setAddOpen(true)}
                className="mt-3 text-sm text-indigo-600 hover:underline"
              >
                Add your first expense
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredExpenses.map((expense) => (
                    <ExpenseItem
                      key={expense.id}
                      expense={expense}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {/* Footer total */}
            <div className="px-4 py-3 border-t border-slate-100 flex justify-between items-center bg-slate-50/40">
              <span className="text-xs text-slate-500">
                {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
              </span>
              <span className="text-sm font-semibold text-slate-900">
                Total: {formatCurrency(total)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Expense">
        <ExpenseForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      {/* Export Modal (v2) */}
      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        expenses={expenses}
      />
    </>
  )
}
