'use client'
// src/app/(app)/admin/students/page.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { formatDate } from '@/src/lib/utils'

interface Student {
  id: number; icNumber: string; name: string; isActive: boolean; createdAt: string
}

function StudentModal({ student, onClose, onSaved }: {
  student: Student | null; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!student
  const [form, setForm] = useState({
    icNumber: student?.icNumber || '',
    name: student?.name || '',
    isActive: student?.isActive ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setError(''); setLoading(true)
    try {
      const res = await fetch(isEdit ? `/api/students/${student!.id}` : '/api/students', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      toast.success(isEdit ? 'Student updated' : 'Student added')
      onSaved()
    } catch { setError('Something went wrong') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold">{isEdit ? 'Edit Student' : 'Add Student'}</h3>
          <button onClick={onClose} className="btn-ghost p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">IC Number</label>
            <input className="input" value={form.icNumber}
              onChange={e => setForm(f => ({ ...f, icNumber: e.target.value }))}
              disabled={isEdit} placeholder="e.g. 990101-10-1234" />
            {isEdit && <p className="text-xs text-slate-400 mt-1">IC Number cannot be changed.</p>}
          </div>
          <div>
            <label className="label">Full name</label>
            <input className="input" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
          </div>
          {isEdit && (
            <div className="flex items-center gap-3">
              <input type="checkbox" id="isActive" className="w-4 h-4 rounded text-brand-600"
                checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Active (visible to requesters)</label>
            </div>
          )}
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-5 justify-end">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={loading} onClick={handleSave}>
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Student'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CsvImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function downloadSample() {
    const csv = 'name,ic_number\nAHMAD BIN ABDULLAH,990101-10-1234\nSITI BINTI MOHAMED,000202-08-5678\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'students_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleUpload() {
    if (!file) { toast.error('Please select a CSV file'); return }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/students/import', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      setResult(data)
      onImported()
    } catch { toast.error('Import failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold">Import Students via CSV</h3>
          <button onClick={onClose} className="btn-ghost p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Format instructions */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
            <p className="font-medium text-slate-700 mb-1">CSV Format</p>
            <p className="text-slate-500 text-xs mb-2">First row must be a header. Columns: <code className="bg-white px-1 rounded">name, ic_number</code></p>
            <button onClick={downloadSample} className="btn-secondary btn-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download sample template
            </button>
          </div>

          {/* File picker */}
          <div
            className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-brand-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-slate-600">{file ? file.name : 'Click to select a CSV file'}</p>
            <p className="text-xs text-slate-400 mt-1">CSV files only</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>

          {/* Results */}
          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
              <p className="font-semibold text-green-800 mb-2">Import complete</p>
              <p className="text-green-700">✅ {result.created} students created</p>
              <p className="text-slate-600">⏭ {result.skipped} already existed (skipped)</p>
              {result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-red-600 font-medium">⚠️ {result.errors.length} errors:</p>
                  <ul className="text-red-600 text-xs mt-1 space-y-0.5 max-h-24 overflow-y-auto">
                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-5 justify-end">
          <button className="btn-secondary" onClick={onClose}>Close</button>
          {!result && (
            <button className="btn-primary" disabled={loading || !file} onClick={handleUpload}>
              {loading ? 'Importing…' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [modal, setModal] = useState<Student | null | 'new'>(null)
  const [showImport, setShowImport] = useState(false)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ search, includeInactive: String(includeInactive) })
    const res = await fetch(`/api/students?${params}`)
    const data = await res.json()
    if (!data.error) setStudents(data)
    setLoading(false)
  }, [search, includeInactive])

  useEffect(() => {
    const t = setTimeout(fetchStudents, 300)
    return () => clearTimeout(t)
  }, [fetchStudents])

  async function handleDelete(s: Student) {
    if (!confirm(`Delete student ${s.name}? This will fail if they have active requests.`)) return
    const res = await fetch(`/api/students/${s.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); return }
    toast.success('Student deleted')
    fetchStudents()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header">
        <div>
          <h1>Student Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">{students.length} students</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3 3m0 0l3-3m-3 3V4" />
            </svg>
            Import CSV
          </button>
          <button className="btn-primary" onClick={() => setModal('new')}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Student
          </button>
        </div>
      </div>

      <div className="card p-3 mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <input className="input flex-1" placeholder="Search by name or student ID…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer shrink-0">
          <input type="checkbox" className="w-4 h-4 rounded text-brand-600"
            checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} />
          Show inactive
        </label>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">Loading…</div>
        ) : students.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No students found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">IC Number</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Added</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id} className={`table-row ${!s.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.icNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button className="btn-ghost btn-sm" onClick={() => setModal(s)}>Edit</button>
                        <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => handleDelete(s)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && (
        <StudentModal
          student={modal === 'new' ? null : modal as Student}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchStudents() }}
        />
      )}
      {showImport && (
        <CsvImportModal
          onClose={() => setShowImport(false)}
          onImported={fetchStudents}
        />
      )}
    </div>
  )
}
