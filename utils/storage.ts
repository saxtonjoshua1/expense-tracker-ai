import { Expense } from '@/types/expense'

const STORAGE_KEY = 'expense_tracker_expenses'

export function loadExpenses(): Expense[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Expense[]
  } catch {
    return []
  }
}

export function saveExpenses(expenses: Expense[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
  } catch {
    console.error('Failed to save expenses to localStorage')
  }
}
