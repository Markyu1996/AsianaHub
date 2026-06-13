// src/lib/workdays.ts
// Pure helpers for the Workday Tracking module: CSV parsing, header matching,
// and the internship-progress estimation engine. No I/O here so the logic is
// easy to test and safe to reuse on both the server and (potentially) client.

const DAY_MS = 24 * 60 * 60 * 1000

/** Canonical CSV header names (matched by name, case-insensitive, trimmed). */
export const CSV_HEADERS = {
  ic: 'IC Number',
  name: 'Student Name',
  workdays: 'Total Workdays',
  group: 'Employer Group',
} as const

/** Number of days in a given month (month is 1-12). */
export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this month.
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * The date a student's cumulative total is accurate as of: the employer
 * group's cutoff day within the data month. The cutoff day is clamped to the
 * last day of the month (e.g. a "30" cutoff in February becomes the 28th/29th).
 */
export function asOfDate(dataYear: number, dataMonth: number, cutoffDay: number): Date {
  const clampedDay = Math.min(Math.max(cutoffDay, 1), daysInMonth(dataYear, dataMonth))
  return new Date(Date.UTC(dataYear, dataMonth - 1, clampedDay))
}

/** Start-of-day (UTC) for a given date, so day math ignores the time component. */
function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export interface MetricsInput {
  cumulativeWorkdays: number // already floored whole days from the CSV
  dataYear: number
  dataMonth: number // 1-12
  cutoffDay: number // employer group's monthly cutoff day
  workdaysPerWeek: number
  requiredWorkdays: number
  now?: Date
}

export interface WorkdayMetrics {
  workdaysCompleted: number // confirmed from the latest CSV
  asOf: string // yyyy-mm-dd the confirmed total is accurate to
  estimatedGap: number // estimated workdays between cutoff and today
  estimatedWorked: number // confirmed + estimated gap
  daysRemaining: number // workdays left to reach the required total
  estCompletionDate: string | null // yyyy-mm-dd, null when complete or not computable
  completed: boolean
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Estimation engine (proportional model):
 *   estimated_gap   = floor(calendar_days_elapsed × workdays_per_week / 7)
 *   estimated_worked = floor(csv_total) + estimated_gap
 *   days_remaining  = max(0, required − estimated_worked)
 *   est_completion  = today + ceil(days_remaining × 7 / workdays_per_week) days
 * All workday counts are whole numbers (floored), matching the rounding rule
 * that a fractional day always rounds down.
 */
export function computeMetrics(input: MetricsInput): WorkdayMetrics {
  const {
    cumulativeWorkdays,
    dataYear,
    dataMonth,
    cutoffDay,
    workdaysPerWeek,
    requiredWorkdays,
  } = input

  const completed = Math.max(0, Math.floor(cumulativeWorkdays))
  const wpw = Number.isFinite(workdaysPerWeek) && workdaysPerWeek > 0 ? workdaysPerWeek : 0

  const asOf = asOfDate(dataYear, dataMonth, cutoffDay)
  const today = startOfUtcDay(input.now ?? new Date())

  const calendarElapsed = Math.max(0, Math.round((today.getTime() - asOf.getTime()) / DAY_MS))
  const estimatedGap = wpw > 0 ? Math.floor((calendarElapsed * wpw) / 7) : 0

  const estimatedWorked = completed + estimatedGap
  const required = Math.max(0, Math.floor(requiredWorkdays))
  const daysRemaining = required > 0 ? Math.max(0, required - estimatedWorked) : 0
  const isComplete = required > 0 && estimatedWorked >= required

  let estCompletionDate: string | null = null
  if (!isComplete && required > 0 && wpw > 0 && daysRemaining > 0) {
    const calendarDaysNeeded = Math.ceil((daysRemaining * 7) / wpw)
    estCompletionDate = toIsoDate(new Date(today.getTime() + calendarDaysNeeded * DAY_MS))
  }

  return {
    workdaysCompleted: completed,
    asOf: toIsoDate(asOf),
    estimatedGap,
    estimatedWorked,
    daysRemaining,
    estCompletionDate,
    completed: isComplete,
  }
}

/**
 * Minimal RFC-4180-style CSV parser: handles quoted fields, embedded commas,
 * escaped double-quotes (""), and both \n and \r\n line endings. Returns an
 * array of rows, each row an array of cell strings.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  // Strip a leading UTF-8 BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  for (let i = 0; i < text.length; i++) {
    const c = text[i]

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
      continue
    }

    if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      // Handle \r\n as a single line break.
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else {
      field += c
    }
  }

  // Flush the final field/row if the file doesn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  // Drop fully-empty rows (e.g. trailing blank lines).
  return rows.filter(r => r.some(cell => cell.trim() !== ''))
}

/** Normalise a header cell for case-insensitive, whitespace-tolerant matching. */
export function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ')
}
