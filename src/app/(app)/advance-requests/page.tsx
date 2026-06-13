'use client'
// src/app/(app)/advance-requests/page.tsx
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'

interface Request {
  id: number
  amount: number
  frequency: number
  status: string
  createdAt: string
  returnedAt: string | null
  student: { name: string; icNumber: string }
  requester: { name: string }
}

interface SessionUser { role: string; id: number }

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'deleted', label: 'Deleted (Admin)' },
]

export default function AdvanceRequestsPage() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
  }, [])

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status !== 'all') params.set('status', status)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    if (status === 'deleted') params.set('includeDeleted', 'true')

    const res = await fetch(`/api/requests?${params}`)
    const data = await res.json()
    if (!data.error) setRequests(data)
    setLoading(false)
  }, [search, status, dateFrom, dateTo])

  useEffect(() => {
    const t = setTimeout(fetchRequests, 300)
    return () => clearTimeout(t)
  }, [fetchRequests])

  const canSubmit = user?.role === 'requester' || user?.role === 'admin'
  const isAdmin = user?.role === 'admin'

  const statusOptions = isAdmin
    ? STATUS_OPTIONS
    : STATUS_OPTIONS.filter(s => s.value !== 'deleted')

  return (
    <div className="max-w-5xl mx-auto">
      <div className="page-header flex-col sm:flex-row gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl font-bold">
            {user?.role === 'requester' ? 'My Requests' : 'All Requests'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {requests.length} record{requests.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canSubmit && (
          <Link href="/advance-requests/new" className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Request
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-1">
            <input
              className="input"
              placeholder="Search by student name or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From date" />
          <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To date" />
        </div>
        {(search || status !== 'all' || dateFrom || dateTo) && (
          <button
            className="btn-ghost btn-sm mt-2 text-slate-500"
            onClick={() => { setSearch(''); setStatus('all'); setDateFrom(''); setDateTo('') }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <svg className="animate-spin h-6 w-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-medium text-slate-500">No requests found</p>
            {canSubmit && (
              <Link href="/advance-requests/new" className="btn-primary btn-sm mt-4 inline-flex">
                Submit first request
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">IC Number</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">Amount</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">Freq</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                  {user?.role !== 'requester' && (
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Submitted by</th>
                  )}
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Approved</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} className="table-row">
                    <td className="px-4 py-3 font-medium text-slate-900">{req.student.name}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{req.student.icNumber}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">RM{req.amount}</td>
                    <td className="px-4 py-3 text-center text-slate-500">#{req.frequency}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${getStatusColor(req.status)}`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </td>
                    {user?.role !== 'requester' && (
                      <td className="px-4 py-3 text-slate-500">{req.requester.name}</td>
                    )}
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{req.returnedAt ? formatDate(req.returnedAt) : '—'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/advance-requests/${req.id}`} className="btn-ghost btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
