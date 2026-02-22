'use client'

import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Expense, ExpenseFormData } from '@/types/expense'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import ExpenseForm from './ExpenseForm'
import { formatCurrency, formatDate } from '@/utils/formatters'

interface ExpenseItemProps {
  expense: Expense
  onUpdate: (id: string, data: ExpenseFormData) => void
  onDelete: (id: string) => void
}

export default function ExpenseItem({ expense, onUpdate, onDelete }: ExpenseItemProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleUpdate(data: ExpenseFormData) {
    onUpdate(expense.id, data)
    setEditOpen(false)
  }

  function handleDelete() {
    onDelete(expense.id)
    setConfirmDelete(false)
  }

  return (
    <>
      <tr className="hover:bg-slate-50/70 transition-colors group">
        <td className="px-4 py-3.5 text-sm text-slate-600 whitespace-nowrap">
          {formatDate(expense.date)}
        </td>
        <td className="px-4 py-3.5 text-sm text-slate-900 max-w-[200px] truncate">
          {expense.description}
        </td>
        <td className="px-4 py-3.5">
          <Badge category={expense.category} />
        </td>
        <td className="px-4 py-3.5 text-sm font-semibold text-slate-900 text-right whitespace-nowrap">
          {formatCurrency(expense.amount)}
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Edit"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </td>
      </tr>

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Expense">
        <ExpenseForm
          initialData={expense}
          onSubmit={handleUpdate}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Expense">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-slate-900">&quot;{expense.description}&quot;</span>?
            This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
