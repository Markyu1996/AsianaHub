'use client'
// src/app/(app)/admin/registrations/page.tsx
import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { formatDateTime } from '@/src/lib/utils'

interface PendingUser { id: number; name: string; email: string; createdAt: string }

const ROLES = [
  { value: 'requester', label: 'Requester' },
  { value: 'approver', label: 'Approver' },
  { value: 'admin', label: 'Administrator' },
]

export default function RegistrationsPage() {
  const [pending, setPending] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<number | null>(null)
  const [roleSelections, setRoleSelections] = useState<Record<number, string>>({})

  const fetchPending = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/registrations')
    const data = await res.json()
    if (!data.error) setPending(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchPending() }, [fetchPending])

  async function handleApprove(user: PendingUser) {
    const role = roleSelections[user.id] || 'requester'
    setProcessing(user.id)
    try {
      const res = await fetch(`/api/admin/registrations/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', role }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success(`${user.name} approved as ${role}`)
      fetchPending()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject(user: PendingUser) {
    if (!confirm(`Reject registration for ${user.name}? This will permanently remove their account.`)) return
    setProcessing(user.id)
    try {
      const res = await fetch(`/api/admin/registrations/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success('Registration rejected')
      fetchPending()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-header">
        <div>
          <h1>Pending Registrations</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {pending.length} account{pending.length !== 1 ? 's' : ''} awaiting approval
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-slate-400">Loading…</div>
      ) : pending.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-medium text-slate-700">All caught up</p>
          <p className="text-slate-500 text-sm mt-1">No pending registrations.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map(user => (
            <div key={user.id} className="card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-semibold text-slate-900 truncate">{user.name}</p>
                  </div>
                  <p className="text-sm text-slate-500 ml-10">{user.email}</p>
                  <p className="text-xs text-slate-400 ml-10 mt-0.5">Registered {formatDateTime(user.createdAt)}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    className="input py-1.5 text-sm w-36"
                    value={roleSelections[user.id] || 'requester'}
                    onChange={e => setRoleSelections(prev => ({ ...prev, [user.id]: e.target.value }))}
                    disabled={processing === user.id}
                  >
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <button
                    className="btn bg-green-600 text-white hover:bg-green-700 btn-sm"
                    onClick={() => handleApprove(user)}
                    disabled={processing === user.id}
                  >
                    {processing === user.id ? '…' : 'Approve'}
                  </button>
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => handleReject(user)}
                    disabled={processing === user.id}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
