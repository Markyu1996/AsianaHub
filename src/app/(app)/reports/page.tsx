'use client'
// src/app/(app)/reports/page.tsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { formatDate } from '@/lib/utils'

interface Student { id: number; name: string; icNumber: string }
interface ReportRow {
  id: number
  amount: number
  frequency: number
  returnedAt: string | null
  remark: string | null
  student: { id: number; name: string; icNumber: string }
  requester: { id: number; name: string }
}
interface ReportData {
  requests: ReportRow[]
  summary: { count: number; totalAmount: number }
}
function startOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function ReportsPage() {
  const [from, setFrom] = useState(startOfMonth())
  const [to, setTo] = useState(today())
  const [scope, setScope] = useState<'all' | 'specific'>('all')

  const [studentSearch, setStudentSearch] = useState('')
  const [results, setResults] = useState<Student[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selected, setSelected] = useState<Student[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<ReportData | null>(null)
  const [ranWith, setRanWith] = useState<{ from: string; to: string; scopeLabel: string } | null>(null)

  const searchStudents = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); return }
    const res = await fetch(`/api/students?search=${encodeURIComponent(q)}`)
    const d = await res.json()
    if (!d.error) setResults(d)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchStudents(studentSearch), 250)
    return () => clearTimeout(t)
  }, [studentSearch, searchStudents])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function addStudent(s: Student) {
    setSelected(prev => prev.find(p => p.id === s.id) ? prev : [...prev, s])
    setStudentSearch('')
    setResults([])
    setShowDropdown(false)
  }
  function removeStudent(id: number) {
    setSelected(prev => prev.filter(p => p.id !== id))
  }

  async function generate() {
    setError('')
    if (!from || !to) { setError('Choose a from and to date'); return }
    if (from > to) { setError('"From" date must be on or before "To" date'); return }
    if (scope === 'specific' && selected.length === 0) {
      setError('Add at least one student, or switch to "All students"')
      return
    }

    setLoading(true)
    setData(null)
    try {
      const params = new URLSearchParams({ from, to })
      if (scope === 'specific') params.set('studentIds', selected.map(s => s.id).join(','))
      const res = await fetch(`/api/reports/advances?${params}`)
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Could not generate report'); return }
      setData(d)
      setRanWith({
        from, to,
        scopeLabel: scope === 'all'
          ? 'All students'
          : selected.map(s => s.name).join(', '),
      })
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Per-student breakdown
  const breakdown = data
    ? Object.values(
        data.requests.reduce((acc, r) => {
          const key = r.student.id
          if (!acc[key]) acc[key] = { name: r.student.name, ic: r.student.icNumber, count: 0, total: 0 }
          acc[key].count += 1
          acc[key].total += r.amount
          return acc
        }, {} as Record<number, { name: string; ic: string; count: number; total: number }>)
      ).sort((a, b) => b.total - a.total)
    : []

  function csvCell(v: string | number) {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  function exportCSV() {
    if (!data || !ranWith) return
    const header = ['Approved date', 'Student', 'IC Number', 'Amount (RM)', 'Frequency', 'Requester', 'Remark']
    const rows = data.requests.map(r => [
      r.returnedAt ? formatDate(r.returnedAt) : '',
      r.student.name, r.student.icNumber, r.amount, `#${r.frequency}`, r.requester.name, r.remark || '',
    ])
    const totalRow = ['', '', '', data.summary.totalAmount, '', '', 'TOTAL']
    const csv = [header, ...rows, totalRow].map(row => row.map(csvCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `allowance-advance-report_${ranWith.from}_${ranWith.to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportPDF() {
    if (!data || !ranWith) return
    const { default: jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF()
    doc.setFontSize(15)
    doc.text('Allowance Advance Report', 14, 16)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Period: ${formatDate(ranWith.from)} — ${formatDate(ranWith.to)} (by approval date)`, 14, 23)
    doc.text(`Students: ${ranWith.scopeLabel}`, 14, 28)
    doc.text(`Total: ${data.summary.count} approved advance(s) · RM${data.summary.totalAmount}`, 14, 33)
    autoTable(doc, {
      startY: 38,
      head: [['Approved date', 'Student', 'IC Number', 'Amount (RM)', 'Freq', 'Requester']],
      body: data.requests.map(r => [
        r.returnedAt ? formatDate(r.returnedAt) : '',
        r.student.name, r.student.icNumber, String(r.amount), `#${r.frequency}`, r.requester.name,
      ]),
      foot: [['', '', 'TOTAL', `RM${data.summary.totalAmount}`, '', '']],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
      footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold' },
    })
    doc.save(`allowance-advance-report_${ranWith.from}_${ranWith.to}.pdf`)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Approved allowance advances by approval date
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-5 mb-5 space-y-5">
        {/* Period */}
        <div>
          <label className="label">Period</label>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span className="text-xs text-slate-500">From</span>
              <input type="date" className="input" value={from} max={to || today()} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <span className="text-xs text-slate-500">To</span>
              <input type="date" className="input" value={to} min={from} max={today()} onChange={e => setTo(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Scope */}
        <div>
          <label className="label">Students</label>
          <div className="flex flex-wrap gap-4 mb-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} />
              All students
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={scope === 'specific'} onChange={() => setScope('specific')} />
              Specific student(s)
            </label>
          </div>

          {scope === 'specific' && (
            <div>
              <div className="relative" ref={dropdownRef}>
                <input
                  className="input"
                  placeholder="Search a student to add…"
                  value={studentSearch}
                  onChange={e => { setStudentSearch(e.target.value); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)}
                  autoComplete="off"
                />
                {showDropdown && studentSearch.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {results.length > 0 ? results.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-2"
                        onClick={() => addStudent(s)}
                      >
                        <span className="font-medium text-sm text-slate-900">{s.name}</span>
                        <span className="text-xs text-slate-400 font-mono shrink-0">{s.icNumber}</span>
                      </button>
                    )) : (
                      <p className="px-4 py-2.5 text-sm text-slate-400">No students found</p>
                    )}
                  </div>
                )}
              </div>

              {selected.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selected.map(s => (
                    <span key={s.id} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 bg-brand-50 border border-brand-100 rounded-full text-sm text-brand-800">
                      {s.name}
                      <button type="button" className="text-brand-400 hover:text-brand-600" onClick={() => removeStudent(s.id)}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button className="btn-primary" onClick={generate} disabled={loading}>
          {loading ? 'Generating…' : 'Generate report'}
        </button>
      </div>

      {/* Results */}
      {data && ranWith && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex gap-4">
              <div className="card px-5 py-3 bg-brand-50 border-0">
                <p className="text-2xl font-bold text-brand-700">{data.summary.count}</p>
                <p className="text-xs text-slate-600">Approved advances</p>
              </div>
              <div className="card px-5 py-3 bg-green-50 border-0">
                <p className="text-2xl font-bold text-green-700">RM{data.summary.totalAmount}</p>
                <p className="text-xs text-slate-600">Total amount</p>
              </div>
            </div>
            {data.summary.count > 0 && (
              <div className="flex gap-2">
                <button className="btn-secondary btn-sm" onClick={exportCSV}>Download CSV</button>
                <button className="btn-secondary btn-sm" onClick={exportPDF}>Download PDF</button>
              </div>
            )}
          </div>

          <p className="text-sm text-slate-500 mb-4">
            {formatDate(ranWith.from)} — {formatDate(ranWith.to)} · {ranWith.scopeLabel}
          </p>

          {data.summary.count === 0 ? (
            <div className="card p-12 text-center text-slate-400">
              <p className="font-medium text-slate-500">No approved advances in this period.</p>
            </div>
          ) : (
            <>
              {/* Per-student breakdown */}
              <div className="card overflow-hidden mb-5">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <h2 className="font-semibold text-slate-700 text-sm">Per-student summary</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <th className="text-left px-4 py-2 font-medium">Student</th>
                        <th className="text-left px-4 py-2 font-medium">IC Number</th>
                        <th className="text-center px-4 py-2 font-medium">Advances</th>
                        <th className="text-right px-4 py-2 font-medium">Total (RM)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakdown.map((b, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="px-4 py-2 font-medium text-slate-900">{b.name}</td>
                          <td className="px-4 py-2 text-slate-500 font-mono text-xs">{b.ic}</td>
                          <td className="px-4 py-2 text-center text-slate-600">{b.count}</td>
                          <td className="px-4 py-2 text-right font-semibold text-slate-900">RM{b.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detail */}
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <h2 className="font-semibold text-slate-700 text-sm">Detail</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <th className="text-left px-4 py-2 font-medium whitespace-nowrap">Approved</th>
                        <th className="text-left px-4 py-2 font-medium">Student</th>
                        <th className="text-left px-4 py-2 font-medium">IC Number</th>
                        <th className="text-right px-4 py-2 font-medium">Amount</th>
                        <th className="text-center px-4 py-2 font-medium">Freq</th>
                        <th className="text-left px-4 py-2 font-medium">Requester</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.requests.map(r => (
                        <tr key={r.id} className="border-b border-slate-100">
                          <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{r.returnedAt ? formatDate(r.returnedAt) : '—'}</td>
                          <td className="px-4 py-2 font-medium text-slate-900">{r.student.name}</td>
                          <td className="px-4 py-2 text-slate-500 font-mono text-xs">{r.student.icNumber}</td>
                          <td className="px-4 py-2 text-right font-semibold text-slate-900">RM{r.amount}</td>
                          <td className="px-4 py-2 text-center text-slate-500">#{r.frequency}</td>
                          <td className="px-4 py-2 text-slate-500">{r.requester.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
