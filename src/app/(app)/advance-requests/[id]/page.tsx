'use client'
// src/app/(app)/advance-requests/[id]/page.tsx
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatDateTime, getStatusColor, getStatusLabel, generateBankReference } from '@/src/lib/utils'

interface RequestDetail {
  id: number
  amount: number
  frequency: number
  status: string
  comment: string | null
  createdAt: string
  attendedAt: string | null
  returnedAt: string | null
  deletedAt: string | null
  hasOutstanding: boolean
  student: { id: number; name: string; icNumber: string }
  requester: { id: number; name: string; email: string }
  attendedByUser: { id: number; name: string } | null
  returnedByUser: { id: number; name: string } | null
  deletedByUser: { id: number; name: string } | null
}

interface SessionUser { id: number; name: string; role: string }

function ConfirmModal({
  title, message, confirmLabel, confirmClass, onConfirm, onCancel, withComment
}: {
  title: string
  message: string
  confirmLabel: string
  confirmClass: string
  onConfirm: (comment: string) => void
  onCancel: () => void
  withComment?: boolean
}) {
  const [comment, setComment] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm mb-4">{message}</p>
        {withComment && (
          <div className="mb-4">
            <label className="label">Comment (optional)</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Add a note…"
              value={comment}
              onChange={e => setComment(e.target.value)}
              maxLength={500}
            />
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={confirmClass} onClick={() => onConfirm(comment)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export default function RequestDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [user, setUser] = useState<SessionUser | null>(null)
  const [request, setRequest] = useState<RequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [modal, setModal] = useState<'attend' | 'complete' | 'delete' | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
  }, [])

  const fetchRequest = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/requests/${id}`)
    const data = await res.json()
    if (res.ok) setRequest(data)
    else toast.error(data.error || 'Request not found')
    setLoading(false)
  }, [id])

  useEffect(() => { fetchRequest() }, [fetchRequest])

  async function handleAction(action: 'attend' | 'complete' | 'delete', comment: string) {
    setActionLoading(true)
    setModal(null)
    try {
      const res = await fetch(`/api/requests/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }

      const messages = {
        attend: 'Request marked as attended',
        complete: 'Advance marked as returned — request completed',
        delete: 'Request deleted',
      }
      toast.success(messages[action])

      if (action === 'delete') {
        router.push('/advance-requests')
      } else {
        fetchRequest()
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setActionLoading(false)
    }
  }

  function handleCopyReference() {
    if (!request) return
    const ref = generateBankReference(request.student.name, request.frequency, request.amount)
    navigator.clipboard.writeText(ref).then(() => {
      setCopied(true)
      toast.success('Reference copied to clipboard')
      setTimeout(() => setCopied(false), 2500)
    }).catch(() => {
      toast.error('Could not copy — please copy manually')
      prompt('Copy this reference:', ref)
    })
  }

  const canAct = user && (user.role === 'approver' || user.role === 'admin')
  const canDelete = user && (
    (user.role === 'approver' && request?.status === 'pending') ||
    user.role === 'admin'
  )
  const isDeleted = request?.status === 'deleted'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-6 w-6 text-brand-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 mb-4">Request not found.</p>
        <Link href="/advance-requests" className="btn-primary">Back to requests</Link>
      </div>
    )
  }

  const bankRef = generateBankReference(request.student.name, request.frequency, request.amount)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
      <Link href="/advance-requests" className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 mb-5">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to requests
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Request #{request.id}</h1>
          <p className="text-slate-500 text-sm mt-1">Submitted {formatDateTime(request.createdAt)}</p>
        </div>
        <span className={`badge text-sm px-3 py-1 ${getStatusColor(request.status)}`}>
          {getStatusLabel(request.status)}
        </span>
      </div>

      {/* Outstanding warning */}
      {request.hasOutstanding && canAct && request.status === 'pending' && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-5">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-red-800 font-semibold text-sm">Outstanding advance warning</p>
            <p className="text-red-600 text-sm mt-0.5">
              This student has an existing advance that has not been returned yet.
            </p>
          </div>
        </div>
      )}

      {/* Main info card */}
      <div className="card p-6 mb-4">
        <h2 className="font-semibold text-slate-900 mb-4">Advance Details</h2>
        <dl className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <dt className="text-sm text-slate-500">Student name</dt>
            <dd className="text-sm font-semibold text-slate-900">{request.student.name}</dd>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <dt className="text-sm text-slate-500">IC Number</dt>
            <dd className="text-sm font-mono text-slate-700">{request.student.icNumber}</dd>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <dt className="text-sm text-slate-500">Amount</dt>
            <dd className="text-lg font-bold text-slate-900">RM{request.amount}</dd>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <dt className="text-sm text-slate-500">Advance frequency</dt>
            <dd className="text-sm font-semibold text-slate-900">#{request.frequency}</dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-sm text-slate-500">Submitted by</dt>
            <dd className="text-sm text-slate-700">{request.requester.name}</dd>
          </div>
        </dl>
      </div>

      {/* Bank Reference */}
      {canAct && !isDeleted && (
        <div className="card p-5 mb-4 border-brand-100 bg-brand-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-brand-900">Bank Transfer Reference</h3>
            <button
              onClick={handleCopyReference}
              className={`btn btn-sm flex items-center gap-1.5 transition-colors ${
                copied
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-brand-600 text-white hover:bg-brand-700'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy reference
                </>
              )}
            </button>
          </div>
          <p className="font-mono text-sm bg-white border border-brand-200 rounded-lg px-3 py-2.5 text-slate-800 select-all break-all">
            {bankRef}
          </p>
          <p className="text-xs text-brand-600 mt-1.5">Paste this into the bank transfer reference field.</p>
        </div>
      )}

      {/* Audit trail */}
      <div className="card p-6 mb-4">
        <h2 className="font-semibold text-slate-900 mb-4">Audit Trail</h2>
        <ol className="relative border-l border-slate-200 ml-3 space-y-4">
          <li className="ml-4">
            <div className="absolute w-3 h-3 bg-brand-500 rounded-full -left-1.5 border-2 border-white" />
            <p className="text-sm font-medium text-slate-900">Request submitted</p>
            <p className="text-xs text-slate-500">{request.requester.name} · {formatDateTime(request.createdAt)}</p>
          </li>
          {request.attendedByUser && request.attendedAt && (
            <li className="ml-4">
              <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-1.5 border-2 border-white" />
              <p className="text-sm font-medium text-slate-900">Marked as attended</p>
              <p className="text-xs text-slate-500">{request.attendedByUser.name} · {formatDateTime(request.attendedAt)}</p>
            </li>
          )}
          {request.returnedByUser && request.returnedAt && (
            <li className="ml-4">
              <div className="absolute w-3 h-3 bg-green-500 rounded-full -left-1.5 border-2 border-white" />
              <p className="text-sm font-medium text-slate-900">Advance returned — completed</p>
              <p className="text-xs text-slate-500">{request.returnedByUser.name} · {formatDateTime(request.returnedAt)}</p>
            </li>
          )}
          {request.deletedByUser && request.deletedAt && (
            <li className="ml-4">
              <div className="absolute w-3 h-3 bg-red-500 rounded-full -left-1.5 border-2 border-white" />
              <p className="text-sm font-medium text-slate-900">Request deleted</p>
              <p className="text-xs text-slate-500">{request.deletedByUser.name} · {formatDateTime(request.deletedAt)}</p>
            </li>
          )}
        </ol>
        {request.comment && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-xs text-slate-500 font-medium mb-1">Comment</p>
            <p className="text-sm text-slate-700">{request.comment}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!isDeleted && canAct && (
        <div className="card p-4 flex flex-wrap gap-3">
          {request.status === 'pending' && (
            <button
              className="btn-primary"
              onClick={() => setModal('attend')}
              disabled={actionLoading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mark as Attended
            </button>
          )}
          {request.status === 'pending_return' && (
            <button
              className="btn bg-green-600 text-white hover:bg-green-700"
              onClick={() => setModal('complete')}
              disabled={actionLoading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Mark as Returned
            </button>
          )}
          {canDelete && (
            <button
              className="btn-danger ml-auto"
              onClick={() => setModal('delete')}
              disabled={actionLoading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Request
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      {modal === 'attend' && (
        <ConfirmModal
          title="Mark as Attended"
          message="Confirm that you have disbursed the advance to the student. This will move the request to Pending Return."
          confirmLabel="Confirm Attended"
          confirmClass="btn-primary"
          onConfirm={comment => handleAction('attend', comment)}
          onCancel={() => setModal(null)}
          withComment
        />
      )}
      {modal === 'complete' && (
        <ConfirmModal
          title="Mark as Returned"
          message="Confirm that the student has returned the advance. This will complete the request."
          confirmLabel="Confirm Returned"
          confirmClass="btn bg-green-600 text-white hover:bg-green-700"
          onConfirm={comment => handleAction('complete', comment)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'delete' && (
        <ConfirmModal
          title="Delete Request"
          message="This request will be removed from normal views. This action cannot be undone."
          confirmLabel="Delete"
          confirmClass="btn-danger"
          onConfirm={comment => handleAction('delete', comment)}
          onCancel={() => setModal(null)}
          withComment
        />
      )}
    </div>
  )
}
