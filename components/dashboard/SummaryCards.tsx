import { TrendingUp, Calendar, Hash, Tag } from 'lucide-react'
import { formatCurrency } from '@/utils/formatters'

interface SummaryCardsProps {
  total: number
  monthly: number
  count: number
  topCategory?: string
}

interface CardProps {
  title: string
  value: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
}

function Card({ title, value, icon, iconBg, iconColor }: CardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
    </div>
  )
}

export default function SummaryCards({ total, monthly, count, topCategory }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        title="Total Spent"
        value={formatCurrency(total)}
        icon={<TrendingUp size={20} />}
        iconBg="bg-indigo-50"
        iconColor="text-indigo-600"
      />
      <Card
        title="This Month"
        value={formatCurrency(monthly)}
        icon={<Calendar size={20} />}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
      />
      <Card
        title="# of Expenses"
        value={count.toString()}
        icon={<Hash size={20} />}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
      />
      <Card
        title="Top Category"
        value={topCategory || '—'}
        icon={<Tag size={20} />}
        iconBg="bg-orange-50"
        iconColor="text-orange-600"
      />
    </div>
  )
}
