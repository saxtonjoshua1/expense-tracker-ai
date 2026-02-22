import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Expense } from '@/types/expense'
import Badge from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/utils/formatters'

interface RecentExpensesProps {
  expenses: Expense[]
}

export default function RecentExpenses({ expenses }: RecentExpensesProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">Recent Expenses</h3>
        <Link
          href="/expenses"
          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {expenses.length === 0 ? (
        <div className="px-5 py-10 text-center text-slate-400 text-sm">
          No expenses yet. Add one to get started!
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {expense.description}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(expense.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-3 shrink-0">
                <Badge category={expense.category} />
                <span className="text-sm font-semibold text-slate-900 w-20 text-right">
                  {formatCurrency(expense.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
