'use client'
// src/app/reset-password/page.tsx
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ResetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setDone(true)
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="card p-8 text-center">
        <p className="text-red-600 mb-4">Invalid or missing reset token.</p>
        <Link href="/forgot-password" className="btn-primary">Request a new link</Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="card p-8 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold mb-2">Password updated</h2>
        <p className="text-slate-500 text-sm mb-6">Your password has been reset successfully.</p>
        <Link href="/login" className="btn-primary">Sign in</Link>
      </div>
    )
  }

  return (
    <div className="card p-8">
      <h2 className="text-xl font-semibold mb-2">Set new password</h2>
      <p className="text-slate-500 text-sm mb-6">Min 8 characters, one uppercase letter, one number.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">New password</label>
          <input type="password" className="input" placeholder="••••••••"
            value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input type="password" className="input" placeholder="••••••••"
            value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} required />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Asiana Hub</h1>
          <p className="text-brand-200 text-sm mt-1">Password recovery</p>
        </div>
        <Suspense fallback={<div className="card p-8 text-center text-slate-500">Loading...</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  )
}
