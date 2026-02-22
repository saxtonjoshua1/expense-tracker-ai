import { Category } from '@/types/expense'

const categoryStyles: Record<Category, string> = {
  Food: 'bg-green-100 text-green-800',
  Transportation: 'bg-blue-100 text-blue-800',
  Entertainment: 'bg-purple-100 text-purple-800',
  Shopping: 'bg-orange-100 text-orange-800',
  Bills: 'bg-red-100 text-red-800',
  Other: 'bg-slate-100 text-slate-700',
}

export const categoryColors: Record<Category, string> = {
  Food: '#16a34a',
  Transportation: '#2563eb',
  Entertainment: '#9333ea',
  Shopping: '#ea580c',
  Bills: '#dc2626',
  Other: '#64748b',
}

interface BadgeProps {
  category: Category
}

export default function Badge({ category }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryStyles[category]}`}
    >
      {category}
    </span>
  )
}
