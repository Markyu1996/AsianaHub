'use client'
// src/app/(app)/advance-requests/new/page.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Student { id: number; name: string; icNumber: string }

export default function NewRequestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isNewStudent, setIsNewStudent] = useState(false)
  const [newStudentId, setNewStudentId] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<number | null>(null)
  const [error, setError] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const searchStudents = useCallback(async (q: string) => {
    if (q.length < 1) { setStudents([]); return }
    const res = await fetch(`/api/students?search=${encodeURIComponent(q)}`)
    const data = await res.json()
    if (!data.error) setStudents(data)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchStudents(studentSearch), 250)
    return () => clearTimeout(t)
  }, [studentSearch, searchStudents])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchFrequency(studentId: number) {
    const res = await fetch(`/api/students/${studentId}/frequency`)
    const data = await res.json()
    if (!data.error) setFrequency(data.nextFrequency)
  }

  function selectStudent(s: Student) {
    setSelectedStudent(s)
    setStudentSearch(s.name)
    setIsNewStudent(false)
    setShowDropdown(false)
    fetchFrequency(s.id)
  }

  function handleAddNew() {
    setIsNewStudent(true)
    setSelectedStudent(null)
    setShowDropdown(false)
    setFrequency(1)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const amt = parseInt(amount)
    if (isNaN(amt) || amt < 1 || amt > 200) {
      setError('Amount must be between RM1 and RM200 (whole numbers only)')
      return
    }

    setLoading(true)
    try {
      let studentId = selectedStudent?.id

      // Create new student if needed
      if (isNewStudent) {
        if (!newStudentId.trim() || !studentSearch.trim()) {
          setError('Please enter both student name and student ID')
          setLoading(false)
          return
        }
        const sRes = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ icNumber: newStudentId.trim(), name: studentSearch.trim() }),
        })
        const sData = await sRes.json()
        if (!sRes.ok) { setError(sData.error); setLoading(false); return }
        studentId = sData.id
      }

      if (!studentId) { setError('Please select or enter a student'); setLoading(false); return }

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, amount: amt }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }

      toast.success('Request submitted successfully')
      router.push('/advance-requests')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="page-header">
        <div>
          <Link href="/advance-requests" className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 mb-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to requests
          </Link>
          <h1>New Money Advance Request</h1>
          <p className="text-slate-500 text-sm mt-1">Maximum amount: RM200 per request</p>
        </div>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Student search */}
          <div>
            <label className="label">Student <span className="text-red-500">*</span></label>
            <div className="relative" ref={dropdownRef}>
              <input
                className="input"
                placeholder="Search by name or student ID…"
                value={studentSearch}
                onChange={e => {
                  setStudentSearch(e.target.value)
                  setSelectedStudent(null)
                  setIsNewStudent(false)
                  setFrequency(null)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
                autoComplete="off"
              />
              {showDropdown && (studentSearch.length > 0) && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {students.length > 0 ? (
                    <>
                      {students.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-2"
                          onClick={() => selectStudent(s)}
                        >
                          <span className="font-medium text-sm text-slate-900">{s.name}</span>
                          <span className="text-xs text-slate-400 font-mono shrink-0">{s.icNumber}</span>
                        </button>
                      ))}
                      <div className="border-t border-slate-100">
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-brand-50 text-brand-600 text-sm font-medium flex items-center gap-2"
                          onClick={handleAddNew}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add &quot;{studentSearch}&quot; as new student
                        </button>
                      </div>
                    </>
                  ) : (
                    <div>
                      <p className="px-4 py-2.5 text-sm text-slate-400">No students found</p>
                      <div className="border-t border-slate-100">
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-brand-50 text-brand-600 text-sm font-medium flex items-center gap-2"
                          onClick={handleAddNew}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add &quot;{studentSearch}&quot; as new student
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected student chip */}
            {selectedStudent && (
              <div className="mt-2 flex items-center gap-2 p-2.5 bg-brand-50 rounded-lg border border-brand-100">
                <svg className="w-4 h-4 text-brand-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-brand-800">{selectedStudent.name}</span>
                <span className="text-xs text-brand-500 font-mono">{selectedStudent.icNumber}</span>
                <button type="button" className="ml-auto text-brand-400 hover:text-brand-600"
                  onClick={() => { setSelectedStudent(null); setStudentSearch(''); setFrequency(null) }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* New student fields */}
            {isNewStudent && (
              <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  New student — will be saved to the system
                </p>
                <div>
                  <label className="label text-amber-900">Student full name</label>
                  <input className="input" value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <label className="label text-amber-900">IC Number</label>
                  <input className="input" value={newStudentId}
                    onChange={e => setNewStudentId(e.target.value)} placeholder="e.g. 990101-10-1234" />
                </div>
              </div>
            )}
          </div>

          {/* Frequency */}
          {frequency !== null && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Advance frequency (this month)</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  #{frequency}
                  <span className="text-sm font-normal text-slate-500 ml-2">
                    {frequency === 1 ? 'First time this month' : `${frequency}${['st','nd','rd'][frequency-2] || 'th'} request this month`}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="label">Amount (RM) <span className="text-red-500">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm">RM</span>
              <input
                type="number"
                className="input pl-10"
                placeholder="0"
                min={1}
                max={200}
                step={1}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Maximum RM200. Whole numbers only.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Submitting…' : 'Submit Request'}
            </button>
            <Link href="/advance-requests" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
