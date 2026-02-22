export type Category =
  | 'Food'
  | 'Transportation'
  | 'Entertainment'
  | 'Shopping'
  | 'Bills'
  | 'Other'

export const CATEGORIES: Category[] = [
  'Food',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Bills',
  'Other',
]

export interface Expense {
  id: string
  date: string       // ISO date string, e.g. "2024-01-15"
  amount: number
  category: Category
  description: string
  createdAt: string  // ISO timestamp
}

export interface FilterState {
  search: string
  category: Category | 'All'
  dateFrom: string
  dateTo: string
}

export interface ExpenseFormData {
  date: string
  amount: string
  category: Category
  description: string
}
