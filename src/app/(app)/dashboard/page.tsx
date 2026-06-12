'use client'
// src/app/(app)/dashboard/page.tsx
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface SessionUser { id: number; name: string; role: string }
interface Stats { pending: number; pendingReturn: number; completed: number; total: number }

export default function DashboardPage() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
    fetch('/api/requests/stats').then(r => r.json()).then(d => { if (!d.error) setStats(d) })
  }, [])

  const roleLabel: Record<string, string> = {
    requester: 'Requester',
    approver: 'Approver',
    admin: 'Administrator',
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back{user ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {user ? roleLabel[user.role] : ''} · Asiana Hub Staff Portal
        </p>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Pending', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Pending Return', value: stats.pendingReturn, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Completed', value: stats.completed, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Total', value: stats.total, color: 'text-brand-600', bg: 'bg-brand-50' },
          ].map(s => (
            <div key={s.label} className={`card p-4 ${s.bg} border-0`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-600 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Feature cards */}
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Features</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Money Advance Card */}
        <Link href="/advance-requests" className="card p-6 hover:shadow-md hover:border-brand-200 transition-all group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-brand-600 transition-colors">
              <svg className="w-6 h-6 text-brand-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 group-hover:text-brand-700">Money Advance</h3>
              <p className="text-sm text-slate-500 mt-1">Submit and manage student advance requests up to RM200.</p>
              <span className="inline-flex items-center gap-1 text-xs text-brand-600 font-medium mt-3">
                Open module
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
