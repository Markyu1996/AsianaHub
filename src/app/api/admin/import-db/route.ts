// src/app/api/admin/import-db/route.ts
import { NextRequest } from 'next/server'
import { requireRole } from '@/src/lib/auth'
import { apiError, apiSuccess } from '@/src/lib/utils'
import { writeFile } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    await requireRole(['admin'])

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return apiError('No file provided')
    if (!file.name.endsWith('.db')) return apiError('File must be a .db SQLite database file')

    // DATABASE_URL looks like: file:/data/advance.db (or file:./dev.db locally)
    const dbUrl = process.env.DATABASE_URL || ''
    const filePath = dbUrl.replace(/^file:/, '')
    const resolvedPath = path.resolve(filePath)

    // Write to a staging file alongside the live database — never overwrite
    // the live file directly while the app is running.
    const dir = path.dirname(resolvedPath)
    const restorePath = path.join(dir, 'restore_upload.db')

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(restorePath, buffer)

    return apiSuccess({
      message: 'File uploaded successfully to staging location.',
      stagingPath: restorePath,
      liveDbPath: resolvedPath,
      sizeBytes: buffer.length,
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403)
    console.error('Import DB error:', err)
    return apiError('Could not upload database', 500)
  }
}
