'use client'

import { useExpenses } from '@/hooks/useExpenses'
import Header from '@/components/layout/Header'
import SummaryCards from '@/components/dashboard/SummaryCards'
import SpendingChart from '@/components/dashboard/SpendingChart'
import RecentExpenses from '@/components/dashboard/RecentExpenses'

export default function DashboardPage() {
  const { stats, recentExpenses, hydrated } = useExpenses()

  if (!hydrated) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header
        title="Dashboard"
        subtitle="Overview of your spending"
      />
      <SummaryCards
        total={stats.total}
        monthly={stats.monthly}
        count={stats.count}
        topCategory={stats.topCategory}
      />
      <SpendingChart byCategory={stats.byCategory} />
      <RecentExpenses expenses={recentExpenses} />
    </div>
  )
}
