'use client'
// src/app/(app)/admin/backup/page.tsx
import { useState, useRef } from 'react'
import toast from 'react-hot-toast'

export default function BackupPage() {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ stagingPath: string; liveDbPath: string; sizeBytes: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleDownload() {
    window.location.href = '/api/admin/export-db'
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) { toast.error('Please select a .db file'); return }
    if (!confirm('This will stage the file for restore. You will still need to swap it in via the Render Shell and restart the service. Continue?')) return

    setUploading(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/import-db', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success('Uploaded to staging. Follow the swap steps below.')
      setResult(data)
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <div>
          <h1>Backup &amp; Restore</h1>
          <p className="text-slate-500 text-sm mt-0.5">Download or restore the SQLite database file</p>
        </div>
      </div>

      {/* Download */}
      <div className="card p-6 mb-5">
        <h2 className="font-semibold text-slate-900 mb-2">Download Backup</h2>
        <p className="text-sm text-slate-500 mb-4">
          Downloads the current live database as a single <code className="bg-slate-100 px-1 rounded">.db</code> file.
          Store it somewhere safe — it contains all user accounts, students, and request history.
        </p>
        <button className="btn-primary" onClick={handleDownload}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download .db file
        </button>
      </div>

      {/* Restore */}
      <div className="card p-6">
        <h2 className="font-semibold text-slate-900 mb-2">Restore from Backup</h2>
        <p className="text-sm text-slate-500 mb-4">
          Upload a previously downloaded <code className="bg-slate-100 px-1 rounded">.db</code> file.
          This stages the file on the server — you must then swap it in manually and restart the service (steps below).
        </p>

        <div className="flex items-center gap-3 mb-4">
          <input ref={fileRef} type="file" accept=".db" className="input" />
          <button className="btn-secondary shrink-0" onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>

        {result && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm space-y-3">
            <p className="font-semibold text-green-800">
              ✅ Uploaded ({(result.sizeBytes / 1024).toFixed(1)} KB) to staging location.
            </p>
            <p className="text-slate-700">
              Now go to the Render <strong>Shell</strong> tab and run:
            </p>
            <pre className="bg-white border border-slate-200 rounded-lg p-3 text-xs overflow-x-auto">
{`rm -f "${result.liveDbPath}" "${result.liveDbPath}-wal" "${result.liveDbPath}-shm"
mv "${result.stagingPath}" "${result.liveDbPath}"`}
            </pre>
            <p className="text-slate-700">
              Then go to the Render dashboard and click <strong>Manual Deploy → Restart service</strong>
              (or trigger a redeploy) so the app reconnects to the restored database.
            </p>
            <p className="text-amber-700">
              ⚠️ The current session (including yours) will be logged out after restart — log back in with
              an account that exists in the <em>restored</em> database.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
