// src/app/api/students/import/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, logAudit } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['admin'])

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return apiError('No file provided')
    if (!file.name.endsWith('.csv')) return apiError('Only CSV files are supported')

    const text = await file.text()
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

    if (lines.length < 2) return apiError('CSV file must have a header row and at least one data row')

    // Skip header row
    const dataLines = lines.slice(1)

    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i]
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''))

      if (parts.length < 2) {
        errors.push(`Row ${i + 2}: Invalid format (expected name, ic_number)`)
        continue
      }

      const [name, icNumber] = parts

      if (!icNumber || !name) {
        errors.push(`Row ${i + 2}: Missing name or IC number`)
        continue
      }

      try {
        const existing = await prisma.student.findUnique({ where: { icNumber } })
        if (existing) {
          skipped++
          continue
        }

        await prisma.student.create({
          data: {
            icNumber,
            name: name.toUpperCase(),
            createdBy: session.id,
          }
        })
        created++
      } catch {
        errors.push(`Row ${i + 2}: Failed to create student ${icNumber}`)
      }
    }

    await logAudit(session.id, 'STUDENTS_CSV_IMPORTED', 'student', undefined, {
      created, skipped, errors: errors.length
    })

    return apiSuccess({ created, skipped, errors })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    console.error('CSV import error:', err)
    return apiError('Something went wrong', 500)
  }
}
