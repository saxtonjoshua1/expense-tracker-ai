'use client'

import { useState } from 'react'
import { CATEGORIES, Category, ExpenseFormData, Expense } from '@/types/expense'
import { todayISO } from '@/utils/formatters'
import Button from '@/components/ui/Button'

interface ExpenseFormProps {
  initialData?: Expense
  onSubmit: (data: ExpenseFormData) => void
  onCancel: () => void
}

interface FormErrors {
  date?: string
  amount?: string
  category?: string
  description?: string
}

export default function ExpenseForm({ initialData, onSubmit, onCancel }: ExpenseFormProps) {
  const [form, setForm] = useState<ExpenseFormData>({
    date: initialData?.date ?? todayISO(),
    amount: initialData ? initialData.amount.toFixed(2) : '',
    category: initialData?.category ?? 'Food',
    description: initialData?.description ?? '',
  })
  const [errors, setErrors] = useState<FormErrors>({})

  function validate(): boolean {
    const errs: FormErrors = {}
    if (!form.date) errs.date = 'Date is required'
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      errs.amount = 'Enter a valid amount greater than 0'
    }
    if (!form.category) errs.category = 'Category is required'
    if (!form.description.trim()) errs.description = 'Description is required'
    else if (form.description.trim().length > 120)
      errs.description = 'Description must be under 120 characters'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) onSubmit(form)
  }

  const field =
    'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition'
  const errField = field + ' border-red-300 focus:ring-red-400'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
        <input
          type="date"
          className={errors.date ? errField : field}
          value={form.date}
          max={todayISO()}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
        />
        {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Amount ($)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          className={errors.amount ? errField : field}
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
        />
        {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
        <select
          className={errors.category ? errField : field}
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <input
          type="text"
          placeholder="What was this expense for?"
          className={errors.description ? errField : field}
          value={form.description}
          maxLength={120}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-500">{errors.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" className="flex-1">
          {initialData ? 'Save Changes' : 'Add Expense'}
        </Button>
      </div>
    </form>
  )
}
