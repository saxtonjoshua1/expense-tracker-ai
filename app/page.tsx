'use client'

import { useState } from 'react'
import { Cloud } from 'lucide-react'
import { useExpenses } from '@/hooks/useExpenses'
import Header from '@/components/layout/Header'
import SummaryCards from '@/components/dashboard/SummaryCards'
import SpendingChart from '@/components/dashboard/SpendingChart'
import RecentExpenses from '@/components/dashboard/RecentExpenses'
import CloudExportModal from '@/components/export/CloudExportModal'

export default function DashboardPage() {
  const { stats, recentExpenses, expenses, hydrated } = useExpenses()
  const [showCloudExport, setShowCloudExport] = useState(false)

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
        actions={
          <button
            onClick={() => setShowCloudExport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold shadow-md shadow-indigo-200 hover:opacity-90 transition-opacity"
          >
            <Cloud size={15} />
            Cloud Export
          </button>
        }
      />
      <SummaryCards
        total={stats.total}
        monthly={stats.monthly}
        count={stats.count}
        topCategory={stats.topCategory}
      />
      <SpendingChart byCategory={stats.byCategory} />
      <RecentExpenses expenses={recentExpenses} />

      <CloudExportModal
        isOpen={showCloudExport}
        onClose={() => setShowCloudExport(false)}
        expenses={expenses}
      />
    </div>
  )
}
