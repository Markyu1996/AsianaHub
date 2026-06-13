'use client'
// src/app/(app)/admin/workday-settings/page.tsx
import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'

interface Group {
  id: number
  name: string
  cutoffDay: number
  _count?: { records: number }
}

function GroupModal({ group, onClose, onSaved }: { group: Group | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!group
  const [name, setName] = useState(group?.name || '')
  const [cutoffDay, setCutoffDay] = useState<number>(group?.cutoffDay ?? 1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(isEdit ? `/api/workdays/groups/${group!.id}` : '/api/workdays/groups', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, cutoffDay }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
        return
      }
      toast.success(isEdit ? 'Group updated' : 'Group added')
      onSaved()
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold">{isEdit ? 'Edit Employer Group' : 'Add Employer Group'}</h3>
          <button onClick={onClose} className="btn-ghost p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Group name</label>
            <input
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Group A"
            />
            <p className="text-xs text-slate-400 mt-1">Must match the Employer Group value used in the CSV (case-insensitive).</p>
          </div>
          <div>
            <label className="label">Monthly cutoff day</label>
            <input
              type="number"
              min={1}
              max={31}
              className="input"
              value={cutoffDay}
              onChange={e => setCutoffDay(Number(e.target.value))}
            />
            <p className="text-xs text-slate-400 mt-1">Day of the month this group&apos;s data is current up to (1–31).</p>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-5 justify-end">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={loading} onClick={handleSave}>
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Group'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WorkdaySettingsPage() {
  const [workdaysPerWeek, setWorkdaysPerWeek] = useState(6)
  const [requiredWorkdays, setRequiredWorkdays] = useState(0)
  const [savingSettings, setSavingSettings] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Group | null | 'new'>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, gRes] = await Promise.all([
        fetch('/api/workdays/settings'),
        fetch('/api/workdays/groups'),
      ])
      const s = await sRes.json()
      const g = await gRes.json()
      if (!s.error) {
        setWorkdaysPerWeek(s.workdaysPerWeek)
        setRequiredWorkdays(s.requiredWorkdays)
      }
      if (Array.isArray(g)) setGroups(g)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  async function saveSettings() {
    setSavingSettings(true)
    try {
      const res = await fetch('/api/workdays/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workdaysPerWeek, requiredWorkdays }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to save')
        return
      }
      toast.success('Settings saved')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSavingSettings(false)
    }
  }

  async function deleteGroup(g: Group) {
    if (!confirm(`Delete employer group "${g.name}"?`)) return
    const res = await fetch(`/api/workdays/groups/${g.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error)
      return
    }
    toast.success('Group deleted')
    fetchAll()
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-header">
        <div>
          <h1>Internship Workday Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Estimation variables and employer groups</p>
        </div>
      </div>

      {/* Estimation settings */}
      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-slate-900 mb-1">Estimation</h2>
        <p className="text-slate-500 text-sm mb-4">
          Used to estimate workdays since each group&apos;s cutoff:{' '}
          <code className="bg-slate-100 px-1 rounded text-xs">gap = floor(days × workdays/week ÷ 7)</code>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Workdays per week</label>
            <input
              type="number"
              min={1}
              max={7}
              className="input"
              value={workdaysPerWeek}
              onChange={e => setWorkdaysPerWeek(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Total required workdays</label>
            <input
              type="number"
              min={0}
              className="input"
              value={requiredWorkdays}
              onChange={e => setRequiredWorkdays(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button className="btn-primary" disabled={savingSettings} onClick={saveSettings}>
            {savingSettings ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Employer groups */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900">Employer Groups</h2>
            <p className="text-slate-500 text-sm">Each group has its own monthly data cutoff day</p>
          </div>
          <button className="btn-primary btn-sm" onClick={() => setModal('new')}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Group
          </button>
        </div>
        {loading ? (
          <div className="p-10 text-center text-slate-400">Loading…</div>
        ) : groups.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No employer groups yet. Add one to enable CSV uploads.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 font-medium text-slate-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Cutoff day</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Students</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.id} className="table-row">
                  <td className="px-6 py-3 font-medium text-slate-900">{g.name}</td>
                  <td className="px-4 py-3 text-slate-600">{g.cutoffDay}</td>
                  <td className="px-4 py-3 text-slate-500">{g._count?.records ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button className="btn-ghost btn-sm" onClick={() => setModal(g)}>
                        Edit
                      </button>
                      <button
                        className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                        onClick={() => deleteGroup(g)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal !== null && (
        <GroupModal
          group={modal === 'new' ? null : (modal as Group)}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            fetchAll()
          }}
        />
      )}
    </div>
  )
}
