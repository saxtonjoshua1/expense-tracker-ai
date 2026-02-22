'use client'

import { useExpenses } from '@/hooks/useExpenses'
import Header from '@/components/layout/Header'
import ExpenseList from '@/components/expenses/ExpenseList'

export default function ExpensesPage() {
  const { expenses, filteredExpenses, filters, setFilters, addExpense, updateExpense, deleteExpense, hydrated } =
    useExpenses()

  if (!hydrated) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-40" />
        <div className="h-16 bg-slate-200 rounded-2xl" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Header title="Expenses" subtitle="Manage and track all your expenses" />
      <ExpenseList
        expenses={expenses}
        filteredExpenses={filteredExpenses}
        filters={filters}
        onFiltersChange={setFilters}
        onAdd={addExpense}
        onUpdate={updateExpense}
        onDelete={deleteExpense}
      />
    </div>
  )
}
