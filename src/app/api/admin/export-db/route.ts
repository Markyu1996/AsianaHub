// src/app/api/admin/export-db/route.ts
import { requireRole } from '@/src/lib/auth'
import { apiError } from '@/src/lib/utils'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET() {
  try {
    await requireRole(['admin'])

    // DATABASE_URL looks like: file:/data/advance.db  (or file:./dev.db locally)
    const dbUrl = process.env.DATABASE_URL || ''
    const filePath = dbUrl.replace(/^file:/, '')
    const resolvedPath = path.resolve(filePath)

    const fileBuffer = await readFile(resolvedPath)
    const dateStr = new Date().toISOString().slice(0, 10)

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="advance-hub-backup-${dateStr}.db"`,
        'Content-Length': String(fileBuffer.length),
      },
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    console.error('Export DB error:', err)
    return apiError('Could not export database', 500)
  }
}
