'use client'

import { useState, useEffect, useMemo } from 'react'
import { Expense, Category, FilterState, ExpenseFormData } from '@/types/expense'
import { loadExpenses, saveExpenses } from '@/utils/storage'
import { currentMonthISO } from '@/utils/formatters'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: 'All',
    dateFrom: '',
    dateTo: '',
  })

  // Load from localStorage on mount
  useEffect(() => {
    setExpenses(loadExpenses())
    setHydrated(true)
  }, [])

  // Persist to localStorage whenever expenses change (after hydration)
  useEffect(() => {
    if (hydrated) {
      saveExpenses(expenses)
    }
  }, [expenses, hydrated])

  function addExpense(data: ExpenseFormData): void {
    const expense: Expense = {
      id: generateId(),
      date: data.date,
      amount: parseFloat(data.amount),
      category: data.category,
      description: data.description.trim(),
      createdAt: new Date().toISOString(),
    }
    setExpenses((prev) => [expense, ...prev])
  }

  function updateExpense(id: string, data: ExpenseFormData): void {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              date: data.date,
              amount: parseFloat(data.amount),
              category: data.category,
              description: data.description.trim(),
            }
          : e
      )
    )
  }

  function deleteExpense(id: string): void {
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  // Filtered list
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (filters.search && !e.description.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      if (filters.category !== 'All' && e.category !== filters.category) {
        return false
      }
      if (filters.dateFrom && e.date < filters.dateFrom) {
        return false
      }
      if (filters.dateTo && e.date > filters.dateTo) {
        return false
      }
      return true
    })
  }, [expenses, filters])

  // Stats
  const stats = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0)

    const { from, to } = currentMonthISO()
    const monthlyExpenses = expenses.filter((e) => e.date >= from && e.date <= to)
    const monthly = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0)

    // By category
    const byCategory: Record<string, number> = {}
    expenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
    })

    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] as
      | Category
      | undefined

    return { total, monthly, byCategory, topCategory, count: expenses.length }
  }, [expenses])

  const recentExpenses = useMemo(() => expenses.slice(0, 5), [expenses])

  return {
    expenses,
    filteredExpenses,
    filters,
    setFilters,
    addExpense,
    updateExpense,
    deleteExpense,
    stats,
    recentExpenses,
    hydrated,
  }
}
