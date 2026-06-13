'use client'
// src/app/(app)/workdays/page.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'

interface GroupRef {
  id: number
  name: string
  cutoffDay: number
}

interface WorkdayRow {
  id: number
  student: { id: number; name: string; icNumber: string }
  group: GroupRef
  dataYear: number
  dataMonth: number
  workdaysCompleted: number
  estimatedGap: number
  estimatedWorked: number
  daysRemaining: number
  estCompletionDate: string | null
  completed: boolean
  asOf: string
}

interface Group {
  id: number
  name: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function lastMonth(): { year: number; month: number } {
  const now = new Date()
  const m = now.getMonth() // 0-11
  if (m === 0) return { year: now.getFullYear() - 1, month: 12 }
  return { year: now.getFullYear(), month: m }
}

function CsvUploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const def = lastMonth()
  const [file, setFile] = useState<File | null>(null)
  const [year, setYear] = useState(def.year)
  const [month, setMonth] = useState(def.month)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function downloadSample() {
    const csv =
      'IC Number,Student Name,Total Workdays,Employer Group\n' +
      '990101-10-1234,AHMAD BIN ABDULLAH,120,Group A\n' +
      '000202-08-5678,SITI BINTI MOHAMED,98.6,Group B\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'workdays_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleUpload() {
    if (!file) {
      toast.error('Please select a CSV file')
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('dataYear', String(year))
      formData.append('dataMonth', String(month))
      const res = await fetch('/api/workdays/import', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Import failed')
        return
      }
      toast.success(
        `Imported ${data.imported} record(s)` +
          (data.createdStudents ? ` (${data.createdStudents} new student(s))` : ''),
      )
      onUploaded()
      onClose()
    } catch {
      toast.error('Import failed')
    } finally {
      setLoading(false)
    }
  }

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold">Upload Workday CSV</h3>
          <button onClick={onClose} className="btn-ghost p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
            <p className="font-medium text-slate-700 mb-1">CSV Format</p>
            <p className="text-slate-500 text-xs mb-2">
              First row must be a header. Columns (any order):{' '}
              <code className="bg-white px-1 rounded">IC Number, Student Name, Total Workdays, Employer Group</code>
            </p>
            <p className="text-slate-500 text-xs mb-2">
              Totals are cumulative-to-date and round down. The whole file is rejected if any row is invalid.
            </p>
            <button onClick={downloadSample} className="btn-secondary btn-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download sample template
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data month</label>
              <select className="input" value={month} onChange={e => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Data year</label>
              <select className="input" value={year} onChange={e => setYear(Number(e.target.value))}>
                {years.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-400 -mt-2">Defaults to last month. Edit if backfilling another month.</p>

          <div
            className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-brand-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-slate-600">{file ? file.name : 'Click to select a CSV file'}</p>
            <p className="text-xs text-slate-400 mt-1">CSV files only (max 5 MB)</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5 justify-end">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={loading || !file} onClick={handleUpload}>
            {loading ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WorkdaysPage() {
  const [role, setRole] = useState<string>('')
  const [rows, setRows] = useState<WorkdayRow[]>([])
  const [settings, setSettings] = useState<{ workdaysPerWeek: number; requiredWorkdays: number } | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [groupId, setGroupId] = useState(0)
  const [status, setStatus] = useState('all')
  const [showUpload, setShowUpload] = useState(false)

  const canUpload = role === 'approver' || role === 'admin'

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.user) setRole(d.user.role)
      })
      .catch(() => {})
    fetch('/api/workdays/groups')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setGroups(d)
      })
      .catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      search,
      groupId: String(groupId),
      status,
    })
    const res = await fetch(`/api/workdays?${params}`)
    const data = await res.json()
    if (!data.error) {
      setRows(data.records)
      setSettings(data.settings)
    }
    setLoading(false)
  }, [search, groupId, status])

  useEffect(() => {
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [fetchData])

  const completedCount = rows.filter(r => r.completed).length

  return (
    <div className="max-w-6xl mx-auto">
      <div className="page-header">
        <div>
          <h1>Internship Workday</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {rows.length} student{rows.length === 1 ? '' : 's'}
            {settings ? ` · ${completedCount} completed · target ${settings.requiredWorkdays} days @ ${settings.workdaysPerWeek}/wk` : ''}
          </p>
        </div>
        {canUpload && (
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => setShowUpload(true)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3 3m0 0l3-3m-3 3V4" />
              </svg>
              Upload CSV
            </button>
          </div>
        )}
      </div>

      <div className="card p-3 mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <input
          className="input flex-1"
          placeholder="Search by name or IC…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input sm:w-48" value={groupId} onChange={e => setGroupId(Number(e.target.value))}>
          <option value={0}>All groups</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select className="input sm:w-44" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            No workday data yet.{canUpload ? ' Upload a CSV to get started.' : ''}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Group</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500" title="Confirmed from the latest CSV">
                    Completed
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500" title="Confirmed + estimated days since the cutoff">
                    Est. today
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">Est. remaining</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Est. completion</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{r.student.name}</div>
                      <div className="font-mono text-xs text-slate-400">{r.student.icNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.group.name}
                      <div className="text-xs text-slate-400">
                        as of {formatDate(r.asOf)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">{r.workdaysCompleted}</td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {r.estimatedWorked}
                      {r.estimatedGap > 0 && <span className="text-xs text-slate-400"> (+{r.estimatedGap})</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{r.daysRemaining}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.completed ? '—' : r.estCompletionDate ? formatDate(r.estCompletionDate) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge ${
                          r.completed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.completed ? 'Completed' : 'In progress'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {settings && settings.requiredWorkdays === 0 && (
        <p className="text-xs text-amber-600 mt-3">
          ⚠️ Required workdays is not set yet — remaining/completion estimates need it. An admin can set it in Workday Settings.
        </p>
      )}

      {showUpload && <CsvUploadModal onClose={() => setShowUpload(false)} onUploaded={fetchData} />}
    </div>
  )
}
