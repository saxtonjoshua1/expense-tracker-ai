import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'

export const metadata: Metadata = {
  title: 'SpendWise – Expense Tracker',
  description: 'Track your personal expenses easily',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50">
        <Sidebar />
        {/* Content offset for sidebar */}
        <main className="md:ml-60 min-h-screen pb-20 md:pb-0">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">{children}</div>
        </main>
      </body>
    </html>
  )
}
