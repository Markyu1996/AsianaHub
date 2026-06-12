'use client'
// src/app/forgot-password/page.tsx
import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Advance Hub</h1>
          <p className="text-brand-200 text-sm mt-1">Password recovery</p>
        </div>
        <div className="card p-8">
          {done ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold mb-2">Check your email</h2>
              <p className="text-slate-500 text-sm mb-6">If an account with that email exists, we&apos;ve sent a password reset link. It expires in 1 hour.</p>
              <Link href="/login" className="btn-primary">Back to Login</Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-2">Forgot your password?</h2>
              <p className="text-slate-500 text-sm mb-6">Enter your email and we&apos;ll send you a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email address</label>
                  <input type="email" className="input" placeholder="you@organisation.com"
                    value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
              <p className="text-center text-sm text-slate-500 mt-6">
                <Link href="/login" className="text-brand-600 hover:text-brand-700 font-medium">← Back to Login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
