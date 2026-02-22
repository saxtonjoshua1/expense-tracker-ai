'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, Cloud, Mail, Download, Link2, Share2, Calendar, Clock,
  CheckCircle, AlertCircle, RefreshCw, Copy, FileText,
  LayoutGrid, History, Zap, Shield, ChevronRight, Loader2,
  QrCode, Trash2, Bell, ExternalLink,
} from 'lucide-react'
import { Expense } from '@/types/expense'
import {
  ExportRecord, getExportHistory, addExportRecord,
  generateShareLink, estimateFileSize, clearExportHistory,
} from '@/utils/exportHistory'

// ─── QR Code Mockup ─────────────────────────────────────────────────────────

function QRCodeDisplay({ value }: { value: string }) {
  const SIZE = 21
  let seed = value.split('').reduce((a, c) => ((a * 31 + c.charCodeAt(0)) | 0), 0)
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }

  const inFinder = (r: number, c: number, or_: number, oc: number) => {
    const dr = r - or_, dc = c - oc
    return dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6
  }
  const finderFilled = (r: number, c: number, or_: number, oc: number) => {
    const dr = r - or_, dc = c - oc
    return dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4)
  }

  const getCell = (r: number, c: number): boolean => {
    if (inFinder(r, c, 0, 0)) return finderFilled(r, c, 0, 0)
    if (inFinder(r, c, 0, SIZE - 7)) return finderFilled(r, c, 0, SIZE - 7)
    if (inFinder(r, c, SIZE - 7, 0)) return finderFilled(r, c, SIZE - 7, 0)
    if (r === 6 || c === 6) return (r + c) % 2 === 0
    return rand() < 0.45
  }

  const CELL = 8
  return (
    <div className="inline-block p-3 bg-white rounded-xl border-2 border-slate-200">
      <svg width={SIZE * CELL} height={SIZE * CELL} style={{ imageRendering: 'pixelated' }}>
        {Array.from({ length: SIZE }, (_, r) =>
          Array.from({ length: SIZE }, (_, c) => (
            <rect
              key={`${r}-${c}`}
              x={c * CELL} y={r * CELL}
              width={CELL} height={CELL}
              fill={getCell(r, c) ? '#0f172a' : '#ffffff'}
            />
          ))
        )}
      </svg>
    </div>
  )
}

// ─── Types & Constants ───────────────────────────────────────────────────────

type TabId = 'templates' | 'destinations' | 'schedule' | 'share' | 'history'

const TEMPLATES = [
  {
    id: 'monthly-summary',
    name: 'Monthly Summary',
    description: 'Month-over-month breakdown with trends and comparisons',
    emoji: '📊',
    gradient: 'from-blue-500 to-cyan-500',
    tag: 'Popular',
    fields: ['Month', 'Total Spent', 'vs Prior Month', 'Top Category'],
  },
  {
    id: 'tax-report',
    name: 'Tax Report',
    description: 'IRS-ready categorized expenses with deduction flags',
    emoji: '🧾',
    gradient: 'from-indigo-500 to-purple-500',
    tag: 'Tax Season',
    fields: ['Date', 'Amount', 'Category', 'Tax Category', 'Deductible'],
  },
  {
    id: 'category-analysis',
    name: 'Category Analysis',
    description: 'Deep dive into spending by category with % breakdown',
    emoji: '🔍',
    gradient: 'from-violet-500 to-pink-500',
    tag: null,
    fields: ['Category', 'Total', '% of Spend', 'Avg per Month', 'Trend'],
  },
  {
    id: 'business-expense',
    name: 'Business Expense',
    description: 'Formatted for corporate reimbursement and AP systems',
    emoji: '💼',
    gradient: 'from-emerald-500 to-teal-500',
    tag: 'Business',
    fields: ['Date', 'Vendor', 'Amount', 'Business Purpose', 'Project'],
  },
  {
    id: 'travel-summary',
    name: 'Travel Summary',
    description: 'Group expenses by trip — ideal for travel reimbursement',
    emoji: '✈️',
    gradient: 'from-orange-500 to-amber-500',
    tag: null,
    fields: ['Trip', 'Transport', 'Accommodation', 'Meals', 'Total'],
  },
]

const FORMATS = ['CSV', 'XLSX', 'JSON', 'PDF']

const DESTINATIONS = [
  {
    id: 'email',
    name: 'Email',
    description: 'Send directly to any inbox',
    icon: Mail,
    color: 'blue',
    alwaysAvailable: true,
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Export to a new or existing sheet',
    icon: LayoutGrid,
    color: 'green',
    alwaysAvailable: false,
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Save to your Dropbox folder',
    icon: Cloud,
    color: 'sky',
    alwaysAvailable: false,
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    description: 'Sync with Microsoft OneDrive',
    icon: Cloud,
    color: 'blue',
    alwaysAvailable: false,
  },
  {
    id: 'local',
    name: 'Download',
    description: 'Save directly to your device',
    icon: Download,
    color: 'slate',
    alwaysAvailable: true,
  },
]

const SCHEDULE_OPTIONS = [
  { id: 'once', label: 'One-time', icon: '⚡' },
  { id: 'daily', label: 'Daily', icon: '📅' },
  { id: 'weekly', label: 'Weekly', icon: '🗓️' },
  { id: 'monthly', label: 'Monthly', icon: '📆' },
]

const MOCK_ACTIVE_SCHEDULES = [
  { id: 's1', name: 'Monthly Summary → Email', next: 'Mar 1, 2026', format: 'CSV' },
  { id: 's2', name: 'Tax Report → Google Sheets', next: 'Apr 15, 2026', format: 'XLSX' },
]

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors font-medium"
    >
      {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function FormatBadge({ format }: { format: string }) {
  const colors: Record<string, string> = {
    CSV: 'bg-green-100 text-green-700',
    XLSX: 'bg-blue-100 text-blue-700',
    JSON: 'bg-orange-100 text-orange-700',
    PDF: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${colors[format] ?? 'bg-slate-100 text-slate-600'}`}>
      {format}
    </span>
  )
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

function TemplatesTab({
  selectedTemplate,
  setSelectedTemplate,
  selectedFormat,
  setSelectedFormat,
}: {
  selectedTemplate: string
  setSelectedTemplate: (id: string) => void
  selectedFormat: string
  setSelectedFormat: (f: string) => void
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            onClick={() => setSelectedTemplate(t.id)}
            className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
              selectedTemplate === t.id
                ? 'border-indigo-500 bg-indigo-50/60'
                : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center text-lg shrink-0`}>
                {t.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 text-sm">{t.name}</span>
                  {t.tag && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-medium">
                      {t.tag}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {t.fields.map(f => (
                    <span key={f} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              {selectedTemplate === t.id && (
                <CheckCircle size={18} className="text-indigo-500 shrink-0 mt-0.5" />
              )}
            </div>
          </button>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Output Format</p>
        <div className="grid grid-cols-4 gap-2">
          {FORMATS.map(f => (
            <button
              key={f}
              onClick={() => setSelectedFormat(f)}
              className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                selectedFormat === f
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function DestinationsTab({
  selected,
  setSelected,
  connectedServices,
  onConnect,
  emailAddress,
  setEmailAddress,
}: {
  selected: string[]
  setSelected: (s: string[]) => void
  connectedServices: Record<string, boolean>
  onConnect: (id: string) => void
  emailAddress: string
  setEmailAddress: (v: string) => void
}) {
  const toggle = (id: string) => {
    const dest = DESTINATIONS.find(d => d.id === id)
    if (dest && !dest.alwaysAvailable && !connectedServices[id]) {
      onConnect(id)
      return
    }
    setSelected(
      selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">Choose one or more export destinations. Connect cloud services to unlock them.</p>
      {DESTINATIONS.map(dest => {
        const isConnected = dest.alwaysAvailable || connectedServices[dest.id]
        const isSelected = selected.includes(dest.id)
        const Icon = dest.icon
        return (
          <div
            key={dest.id}
            className={`rounded-xl border-2 p-4 transition-all ${
              isSelected ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-100 bg-white'
            } ${!isConnected ? 'opacity-75' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600 shrink-0`}>
                <Icon size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900">{dest.name}</span>
                  <StatusDot connected={isConnected} />
                  <span className="text-xs text-slate-400">{isConnected ? 'Connected' : 'Not connected'}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{dest.description}</p>
              </div>
              {isConnected ? (
                <button
                  onClick={() => toggle(dest.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                    isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 hover:border-indigo-400'
                  }`}
                >
                  {isSelected && <CheckCircle size={14} className="text-white" />}
                </button>
              ) : (
                <button
                  onClick={() => onConnect(dest.id)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors font-medium flex items-center gap-1 shrink-0"
                >
                  Connect <ExternalLink size={11} />
                </button>
              )}
            </div>
            {dest.id === 'email' && isSelected && (
              <div className="mt-3 pt-3 border-t border-indigo-100">
                <input
                  type="email"
                  value={emailAddress}
                  onChange={e => setEmailAddress(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
        )
      })}

      <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 p-4 flex items-start gap-3">
        <Shield size={16} className="text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-700">
          <strong>End-to-end encrypted.</strong> Your data is encrypted in transit and at rest. We never store your financial data on our servers.
        </p>
      </div>
    </div>
  )
}

function ScheduleTab({
  frequency,
  setFrequency,
}: {
  frequency: string
  setFrequency: (f: string) => void
}) {
  const [time, setTime] = useState('09:00')
  const [dayOfWeek, setDayOfWeek] = useState('Monday')
  const [dayOfMonth, setDayOfMonth] = useState('1')

  const nextRunText = () => {
    const now = new Date()
    if (frequency === 'once') return 'Immediately after clicking Export'
    if (frequency === 'daily') return `Tomorrow at ${time}`
    if (frequency === 'weekly') return `Next ${dayOfWeek} at ${time}`
    return `The ${dayOfMonth}${dayOfMonth === '1' ? 'st' : dayOfMonth === '2' ? 'nd' : dayOfMonth === '3' ? 'rd' : 'th'} of next month at ${time}`
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Frequency</p>
        <div className="grid grid-cols-2 gap-2">
          {SCHEDULE_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setFrequency(opt.id)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                frequency === opt.id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-100 bg-white text-slate-700 hover:border-slate-200'
              }`}
            >
              <span>{opt.icon}</span> {opt.label}
            </button>
          ))}
        </div>
      </div>

      {frequency !== 'once' && (
        <div className="space-y-3">
          {frequency === 'weekly' && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Day of Week</label>
              <select
                value={dayOfWeek}
                onChange={e => setDayOfWeek(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
          )}
          {frequency === 'monthly' && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Day of Month</label>
              <select
                value={dayOfMonth}
                onChange={e => setDayOfMonth(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {Array.from({ length: 28 }, (_, i) => String(i + 1)).map(d => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Time</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>
        </div>
      )}

      <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={14} className="text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Next Run</span>
        </div>
        <p className="text-sm font-medium text-slate-800">{nextRunText()}</p>
      </div>

      {MOCK_ACTIVE_SCHEDULES.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Active Schedules</p>
          <div className="space-y-2">
            {MOCK_ACTIVE_SCHEDULES.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 bg-white">
                <Bell size={14} className="text-indigo-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                  <p className="text-xs text-slate-400">Next: {s.next}</p>
                </div>
                <FormatBadge format={s.format} />
                <button className="text-slate-300 hover:text-red-400 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ShareTab({
  expenses,
  selectedTemplate,
  selectedFormat,
}: {
  expenses: Expense[]
  selectedTemplate: string
  selectedFormat: string
}) {
  const [shareLink, setShareLink] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [permission, setPermission] = useState<'view' | 'edit'>('view')
  const [expiry, setExpiry] = useState('7d')

  const handleGenerate = async () => {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 1200))
    setShareLink(generateShareLink())
    setGenerating(false)
  }

  const template = TEMPLATES.find(t => t.id === selectedTemplate)

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Share2 size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-900">Generate Shareable Link</p>
            <p className="text-xs text-slate-500">{template?.name ?? 'Export'} · {selectedFormat} · {expenses.length} expenses</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Permission</label>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              {(['view', 'edit'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPermission(p)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors capitalize ${
                    permission === p ? 'bg-indigo-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p} only
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Expires In</label>
            <select
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="1d">1 day</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="never">Never</option>
            </select>
          </div>
        </div>

        {!shareLink ? (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-70"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
            {generating ? 'Generating secure link…' : 'Generate Link'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200">
              <Link2 size={14} className="text-slate-400 shrink-0" />
              <span className="flex-1 text-xs text-slate-700 font-mono truncate">{shareLink}</span>
              <CopyButton text={shareLink} />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowQR(!showQR)}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-medium"
              >
                <QrCode size={13} />
                {showQR ? 'Hide' : 'Show'} QR Code
              </button>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-medium"
              >
                <RefreshCw size={13} />
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>

      {showQR && shareLink && (
        <div className="flex flex-col items-center gap-3 py-4">
          <QRCodeDisplay value={shareLink} />
          <p className="text-xs text-slate-500 text-center">
            Scan to open the shared report<br />
            <span className="text-slate-400">Expires in {expiry === 'never' ? 'never' : expiry}</span>
          </p>
        </div>
      )}

      <div className="rounded-xl border border-slate-100 bg-white p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Integration Widgets</p>
        <div className="space-y-2">
          {[
            { label: 'Notion page embed', snippet: '<iframe src="' + (shareLink || 'your-link') + '/embed" />' },
            { label: 'Slack webhook summary', snippet: '/spendwise report monthly-summary' },
          ].map(w => (
            <div key={w.label} className="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-700">{w.label}</span>
                <CopyButton text={w.snippet} />
              </div>
              <code className="text-xs text-slate-500 font-mono break-all">{w.snippet}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function HistoryTab({
  history,
  onClear,
}: {
  history: ExportRecord[]
  onClear: () => void
}) {
  const statusIcon = (status: ExportRecord['status']) => {
    if (status === 'completed') return <CheckCircle size={14} className="text-emerald-500" />
    if (status === 'failed') return <AlertCircle size={14} className="text-red-400" />
    return <Loader2 size={14} className="text-indigo-400 animate-spin" />
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <History size={36} className="text-slate-200 mb-3" />
        <p className="text-sm font-medium text-slate-500">No exports yet</p>
        <p className="text-xs text-slate-400 mt-1">Your export history will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{history.length} export{history.length !== 1 ? 's' : ''} recorded</p>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
        >
          <Trash2 size={12} />
          Clear all
        </button>
      </div>
      <div className="space-y-2">
        {history.map(record => (
          <div key={record.id} className="flex items-start gap-3 px-4 py-3 rounded-xl border border-slate-100 bg-white">
            <div className="mt-0.5">{statusIcon(record.status)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-slate-800">
                  {TEMPLATES.find(t => t.id === record.template)?.name ?? record.template}
                </span>
                <FormatBadge format={record.format} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {record.destination} · {record.expenseCount} items · {record.fileSize}
              </p>
              <p className="text-xs text-slate-400">
                {new Date(record.timestamp).toLocaleString()}
              </p>
            </div>
            {record.shareLink && (
              <a
                href={record.shareLink}
                onClick={e => e.preventDefault()}
                className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 shrink-0"
              >
                <Link2 size={12} /> Link
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface CloudExportModalProps {
  isOpen: boolean
  onClose: () => void
  expenses: Expense[]
}

export default function CloudExportModal({ isOpen, onClose, expenses }: CloudExportModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('templates')
  const [selectedTemplate, setSelectedTemplate] = useState('monthly-summary')
  const [selectedFormat, setSelectedFormat] = useState('CSV')
  const [selectedDestinations, setSelectedDestinations] = useState(['local'])
  const [connectedServices, setConnectedServices] = useState<Record<string, boolean>>({
    'google-sheets': false,
    dropbox: false,
    onedrive: false,
  })
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success'>('idle')
  const [emailAddress, setEmailAddress] = useState('')
  const [scheduleFrequency, setScheduleFrequency] = useState('once')
  const [exportHistory, setExportHistory] = useState<ExportRecord[]>([])

  const refreshHistory = useCallback(() => setExportHistory(getExportHistory()), [])

  useEffect(() => {
    if (isOpen) {
      refreshHistory()
      setExportStatus('idle')
    }
  }, [isOpen, refreshHistory])

  const handleConnect = (serviceId: string) => {
    // Simulate OAuth connect flow
    setTimeout(() => {
      setConnectedServices(prev => ({ ...prev, [serviceId]: true }))
      setSelectedDestinations(prev => [...prev, serviceId])
    }, 800)
  }

  const handleExport = async () => {
    if (selectedDestinations.length === 0) return
    setExportStatus('exporting')

    await new Promise(r => setTimeout(r, 1800))

    // Perform local CSV download if 'local' is selected
    if (selectedDestinations.includes('local')) {
      const template = TEMPLATES.find(t => t.id === selectedTemplate)
      const headers = template?.fields ?? ['Date', 'Description', 'Category', 'Amount']
      const rows = expenses.map(e => [e.date, e.description, e.category, e.amount.toFixed(2)])
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `spendwise-${selectedTemplate}-${new Date().toISOString().slice(0, 10)}.${selectedFormat.toLowerCase()}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    const fileSize = estimateFileSize(expenses.length, selectedFormat)
    for (const dest of selectedDestinations) {
      addExportRecord({
        template: selectedTemplate,
        format: selectedFormat,
        destination: dest,
        status: 'completed',
        fileSize,
        expenseCount: expenses.length,
      })
    }

    refreshHistory()
    setExportStatus('success')
    setTimeout(() => setExportStatus('idle'), 3000)
  }

  const handleClearHistory = () => {
    clearExportHistory()
    refreshHistory()
  }

  if (!isOpen) return null

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'destinations', label: 'Send To', icon: Zap },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'share', label: 'Share', icon: Share2 },
    { id: 'history', label: 'History', icon: History },
  ]

  const selectedTemplateName = TEMPLATES.find(t => t.id === selectedTemplate)?.name ?? selectedTemplate
  const connectedCount = Object.values(connectedServices).filter(Boolean).length + 2

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 p-6 shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Cloud size={16} className="text-white/70" />
                <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">SpendWise Cloud</span>
              </div>
              <h2 className="text-white text-lg font-bold leading-tight">Export & Sync Center</h2>
              <p className="text-white/60 text-xs mt-1">
                {expenses.length} expense{expenses.length !== 1 ? 's' : ''} ready · {connectedCount} services connected
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white text-xs font-medium">Live Sync</span>
              </div>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-0.5 bg-white/10 rounded-xl p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <tab.icon size={11} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'templates' && (
            <TemplatesTab
              selectedTemplate={selectedTemplate}
              setSelectedTemplate={setSelectedTemplate}
              selectedFormat={selectedFormat}
              setSelectedFormat={setSelectedFormat}
            />
          )}
          {activeTab === 'destinations' && (
            <DestinationsTab
              selected={selectedDestinations}
              setSelected={setSelectedDestinations}
              connectedServices={connectedServices}
              onConnect={handleConnect}
              emailAddress={emailAddress}
              setEmailAddress={setEmailAddress}
            />
          )}
          {activeTab === 'schedule' && (
            <ScheduleTab
              frequency={scheduleFrequency}
              setFrequency={setScheduleFrequency}
            />
          )}
          {activeTab === 'share' && (
            <ShareTab
              expenses={expenses}
              selectedTemplate={selectedTemplate}
              selectedFormat={selectedFormat}
            />
          )}
          {activeTab === 'history' && (
            <HistoryTab history={exportHistory} onClear={handleClearHistory} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate">{selectedTemplateName}</p>
              <p className="text-xs text-slate-400">
                {selectedFormat} · {selectedDestinations.length} destination{selectedDestinations.length !== 1 ? 's' : ''}
                {scheduleFrequency !== 'once' ? ` · ${scheduleFrequency}` : ''}
              </p>
            </div>
            <button
              onClick={handleExport}
              disabled={exportStatus === 'exporting' || selectedDestinations.length === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
                exportStatus === 'success'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 shadow-md shadow-indigo-200 disabled:opacity-60'
              }`}
            >
              {exportStatus === 'exporting' && <Loader2 size={15} className="animate-spin" />}
              {exportStatus === 'success' && <CheckCircle size={15} />}
              {exportStatus === 'idle' && <ChevronRight size={15} />}
              {exportStatus === 'exporting'
                ? 'Exporting…'
                : exportStatus === 'success'
                ? 'Done!'
                : 'Export Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
