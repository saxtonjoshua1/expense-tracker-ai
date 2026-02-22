export interface ExportRecord {
  id: string
  template: string
  format: string
  destination: string
  status: 'completed' | 'failed' | 'pending'
  timestamp: string
  fileSize: string
  expenseCount: number
  shareLink?: string
}

const STORAGE_KEY = 'spendwise_export_history'

export function getExportHistory(): ExportRecord[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function addExportRecord(data: Omit<ExportRecord, 'id' | 'timestamp'>): ExportRecord {
  const record: ExportRecord = {
    ...data,
    id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  }
  const history = getExportHistory()
  const updated = [record, ...history].slice(0, 50)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return record
}

export function generateShareLink(): string {
  const token = Array.from({ length: 12 }, () =>
    Math.random().toString(36)[2]
  ).join('')
  return `https://spendwise.app/share/${token}`
}

export function clearExportHistory(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function estimateFileSize(expenseCount: number, format: string): string {
  const bytesPerRow: Record<string, number> = {
    CSV: 80,
    XLSX: 150,
    JSON: 200,
    PDF: 500,
  }
  const bytes = expenseCount * (bytesPerRow[format] ?? 100) + 512
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
