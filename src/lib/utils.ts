// src/lib/utils.ts

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function generateBankReference(
  studentName: string,
  frequency: number,
  amount: number
): string {
  const now = new Date()

  // DDMMYYYY
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  const dateStr = `${day}${month}${year}`

  // MONYR e.g. JUN26
  const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  const monStr = monthNames[now.getMonth()]
  const yrStr = String(year).slice(2)
  const monYear = `${monStr}${yrStr}`

  const nameStr = studentName.toUpperCase().trim()

  return `${dateStr} ${nameStr} ${monYear} ADVANCE${frequency} RM${amount}`
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    attended: 'Attended',
    pending_return: 'Pending Return',
    completed: 'Completed',
    deleted: 'Deleted',
  }
  return labels[status] || status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    attended: 'bg-blue-100 text-blue-800',
    pending_return: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    deleted: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function generateResetToken(): string {
  const array = new Uint8Array(32)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    // Node.js fallback
    const { randomBytes } = require('crypto')
    const buf = randomBytes(32)
    return buf.toString('hex')
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function getStartOfMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
}

export function apiError(message: string, status: number = 400) {
  return Response.json({ error: message }, { status })
}

export function apiSuccess<T>(data: T, status: number = 200) {
  return Response.json(data, { status })
}
