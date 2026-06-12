'use client'
// src/app/(app)/admin/users/page.tsx
import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'

interface User {
  id: number; name: string; email: string; role: string
  status: string; createdAt: string; failedLoginAttempts: number; lockedAt: string | null
}

const ROLE_LABELS: Record<string, string> = {
  requester: 'Requester', approver: 'Approver', admin: 'Administrator'
}
const ROLE_COLORS: Record<string, string> = {
  requester: 'bg-slate-100 text-slate-700',
  approver: 'bg-blue-100 text-blue-700',
  admin: 'bg-purple-100 text-purple-700',
}

function UserModal({
  user, onClose, onSaved
}: {
  user: User | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!user
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'requester',
    status: user?.status || 'active',
    password: '',
    newPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'details' | 'password'>('details')

  async function handleSave() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(isEdit ? `/api/admin/users/${user!.id}` : '/api/admin/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit
          ? { name: form.name, email: form.email, role: form.role, status: form.status }
          : { name: form.name, email: form.email, role: form.role, password: form.password }
        ),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      toast.success(isEdit ? 'User updated' : 'User created')
      onSaved()
    } catch { setError('Something went wrong') }
    finally { setLoading(false) }
  }

  async function handleResetPassword() {
    if (!form.newPassword) { setError('Enter a new password'); return }
    setError(''); setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user!.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: form.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      toast.success('Password reset. User must change it on next login.')
      onClose()
    } catch { setError('Something went wrong') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">{isEdit ? 'Edit User' : 'Create User'}</h3>
          <button onClick={onClose} className="btn-ghost p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isEdit && (
          <div className="flex border-b border-slate-100">
            {(['details', 'password'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                  tab === t ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {t === 'password' ? 'Reset Password' : 'Details'}
              </button>
            ))}
          </div>
        )}

        <div className="p-6 space-y-4">
          {(!isEdit || tab === 'details') && (
            <>
              <div>
                <label className="label">Full name</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="requester">Requester</option>
                  <option value="approver">Approver</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              {isEdit && (
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="deactivated">Deactivated</option>
                  </select>
                </div>
              )}
              {!isEdit && (
                <div>
                  <label className="label">Password</label>
                  <input type="password" className="input" placeholder="Min 8 chars, one uppercase, one number"
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                  <p className="text-xs text-slate-400 mt-1">User will be prompted to change this on first login.</p>
                </div>
              )}
            </>
          )}

          {isEdit && tab === 'password' && (
            <div>
              <label className="label">New password</label>
              <input type="password" className="input" placeholder="Min 8 chars, one uppercase, one number"
                value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} />
              <p className="text-xs text-slate-400 mt-1">User will be prompted to change this on next login.</p>
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
        </div>

        <div className="flex gap-3 px-6 pb-5 justify-end">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={loading}
            onClick={isEdit && tab === 'password' ? handleResetPassword : handleSave}>
            {loading ? 'Saving…' : isEdit && tab === 'password' ? 'Reset Password' : isEdit ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<User | null | 'new'>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`)
    const data = await res.json()
    if (!data.error) setUsers(data)
    setLoading(false)
  }, [search])

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300)
    return () => clearTimeout(t)
  }, [fetchUsers])

  async function handleDelete(user: User) {
    if (!confirm(`Delete user ${user.name}? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); return }
    toast.success('User deleted')
    fetchUsers()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">{users.length} users</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('new')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </div>

      <div className="card p-3 mb-5">
        <input className="input" placeholder="Search by name or email…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">User</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Joined</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="table-row">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                      {user.lockedAt && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 mt-0.5">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          Locked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700'}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {user.status === 'active' ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button className="btn-ghost btn-sm" onClick={() => setModal(user)}>Edit</button>
                        <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => handleDelete(user)}>Delete</button>
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
        <UserModal
          user={modal === 'new' ? null : modal as User}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchUsers() }}
        />
      )}
    </div>
  )
}
