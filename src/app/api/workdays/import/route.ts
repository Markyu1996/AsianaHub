// src/app/api/workdays/import/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, logAudit } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'
import { parseCsv, normalizeHeader, CSV_HEADERS } from '@/lib/workdays'

// Reject oversized uploads outright to bound memory/CPU usage.
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB
const MAX_ROWS = 50_000

interface ParsedRow {
  icNumber: string
  name: string
  workdays: number
  groupId: number
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['approver', 'admin'])

    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) return apiError('No file provided')
    if (!file.name.toLowerCase().endsWith('.csv')) return apiError('Only CSV files are supported')
    if (file.size === 0) return apiError('The uploaded file is empty')
    if (file.size > MAX_FILE_BYTES) return apiError('File is too large (max 5 MB)')

    // Data month: defaults to last month (T-1) but the client may override it.
    const now = new Date()
    const defaultMonth = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth()
    const defaultYear = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear()

    const dataYear = parseIntField(formData.get('dataYear'), defaultYear)
    const dataMonth = parseIntField(formData.get('dataMonth'), defaultMonth)
    if (!Number.isInteger(dataYear) || dataYear < 2000 || dataYear > 2100) {
      return apiError('Invalid data year')
    }
    if (!Number.isInteger(dataMonth) || dataMonth < 1 || dataMonth > 12) {
      return apiError('Invalid data month')
    }

    const text = await file.text()
    const rows = parseCsv(text)
    if (rows.length < 2) {
      return apiError('CSV must have a header row and at least one data row')
    }
    if (rows.length - 1 > MAX_ROWS) {
      return apiError(`Too many rows (max ${MAX_ROWS})`)
    }

    // Map the four required columns by header name (order-independent).
    const header = rows[0].map(normalizeHeader)
    const colIc = header.indexOf(normalizeHeader(CSV_HEADERS.ic))
    const colName = header.indexOf(normalizeHeader(CSV_HEADERS.name))
    const colWorkdays = header.indexOf(normalizeHeader(CSV_HEADERS.workdays))
    const colGroup = header.indexOf(normalizeHeader(CSV_HEADERS.group))

    const missing: string[] = []
    if (colIc === -1) missing.push(CSV_HEADERS.ic)
    if (colName === -1) missing.push(CSV_HEADERS.name)
    if (colWorkdays === -1) missing.push(CSV_HEADERS.workdays)
    if (colGroup === -1) missing.push(CSV_HEADERS.group)
    if (missing.length > 0) {
      return apiError(`Missing required column(s): ${missing.join(', ')}`)
    }

    // Look up employer groups once, keyed by lowercased name for matching.
    const groups = await prisma.employerGroup.findMany({ select: { id: true, name: true } })
    if (groups.length === 0) {
      return apiError('No employer groups are configured yet. Add them in settings first.')
    }
    const groupByName = new Map(groups.map(g => [g.name.toLowerCase(), g.id]))

    // Validate every row first — all-or-nothing. Nothing is written unless the
    // entire file is valid.
    const parsedRows: ParsedRow[] = []
    const seenIc = new Set<string>()

    for (let i = 1; i < rows.length; i++) {
      const rowNo = i + 1 // 1-based, accounting for the header row
      const cells = rows[i]

      const icNumber = (cells[colIc] ?? '').trim()
      const name = (cells[colName] ?? '').trim()
      const workdaysRaw = (cells[colWorkdays] ?? '').trim()
      const groupRaw = (cells[colGroup] ?? '').trim()

      if (!icNumber) return apiError(`Row ${rowNo}: missing ${CSV_HEADERS.ic}`)
      if (icNumber.length > 50) return apiError(`Row ${rowNo}: ${CSV_HEADERS.ic} is too long`)
      if (!name) return apiError(`Row ${rowNo}: missing ${CSV_HEADERS.name}`)
      if (name.length > 200) return apiError(`Row ${rowNo}: ${CSV_HEADERS.name} is too long`)

      const dupKey = icNumber.toLowerCase()
      if (seenIc.has(dupKey)) {
        return apiError(`Row ${rowNo}: duplicate ${CSV_HEADERS.ic} "${icNumber}" in file`)
      }
      seenIc.add(dupKey)

      const workdaysNum = Number(workdaysRaw)
      if (workdaysRaw === '' || !Number.isFinite(workdaysNum)) {
        return apiError(`Row ${rowNo}: ${CSV_HEADERS.workdays} "${workdaysRaw}" is not a number`)
      }
      if (workdaysNum < 0) {
        return apiError(`Row ${rowNo}: ${CSV_HEADERS.workdays} cannot be negative`)
      }
      const workdays = Math.floor(workdaysNum) // fractional days round down

      const groupId = groupByName.get(groupRaw.toLowerCase())
      if (!groupId) {
        return apiError(`Row ${rowNo}: unknown ${CSV_HEADERS.group} "${groupRaw}"`)
      }

      parsedRows.push({ icNumber, name, workdays, groupId })
    }

    // Persist atomically: upsert students by IC, then upsert their snapshot.
    let createdStudents = 0
    await prisma.$transaction(async tx => {
      for (const r of parsedRows) {
        let student = await tx.student.findUnique({ where: { icNumber: r.icNumber } })
        if (!student) {
          student = await tx.student.create({
            data: { icNumber: r.icNumber, name: r.name.toUpperCase(), createdBy: session.id },
          })
          createdStudents++
        }

        await tx.workdayRecord.upsert({
          where: { studentId: student.id },
          create: {
            studentId: student.id,
            employerGroupId: r.groupId,
            cumulativeWorkdays: r.workdays,
            dataYear,
            dataMonth,
            uploadedBy: session.id,
          },
          update: {
            employerGroupId: r.groupId,
            cumulativeWorkdays: r.workdays,
            dataYear,
            dataMonth,
            uploadedBy: session.id,
          },
        })
      }
    })

    await logAudit(session.id, 'WORKDAY_CSV_IMPORTED', 'workday', undefined, {
      rows: parsedRows.length,
      createdStudents,
      dataYear,
      dataMonth,
    })

    return apiSuccess({
      imported: parsedRows.length,
      createdStudents,
      dataYear,
      dataMonth,
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    console.error('Workday CSV import error:', err)
    return apiError('Something went wrong', 500)
  }
}

function parseIntField(value: FormDataEntryValue | null, fallback: number): number {
  if (typeof value !== 'string' || value.trim() === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : NaN
}
