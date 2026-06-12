'use client'
// src/app/(app)/layout.tsx
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface SessionUser {
  id: number
  name: string
  email: string
  role: string
}

interface NavLink {
  type: 'link'
  href: string
  label: string
  icon: string
}

interface NavGroup {
  type: 'group'
  label: string
  icon: string
  items: { href: string; label: string; icon: string }[]
}

type NavEntry = NavLink | NavGroup

const NAV_ITEMS: Record<string, NavEntry[]> = {
  requester: [
    { type: 'link', href: '/dashboard', label: 'Dashboard', icon: 'home' },
    {
      type: 'group',
      label: 'Money Advance',
      icon: 'wallet',
      items: [
        { href: '/advance-requests', label: 'My Requests', icon: 'document' },
        { href: '/advance-requests/new', label: 'New Request', icon: 'plus' },
      ],
    },
  ],
  approver: [
    { type: 'link', href: '/dashboard', label: 'Dashboard', icon: 'home' },
    {
      type: 'group',
      label: 'Money Advance',
      icon: 'wallet',
      items: [
        { href: '/advance-requests', label: 'All Requests', icon: 'document' },
      ],
    },
  ],
  admin: [
    { type: 'link', href: '/dashboard', label: 'Dashboard', icon: 'home' },
    {
      type: 'group',
      label: 'Money Advance',
      icon: 'wallet',
      items: [
        { href: '/advance-requests', label: 'All Requests', icon: 'document' },
        { href: '/advance-requests/new', label: 'New Request', icon: 'plus' },
      ],
    },
    {
      type: 'group',
      label: 'Administration',
      icon: 'user-cog',
      items: [
        { href: '/admin/registrations', label: 'Registrations', icon: 'users' },
        { href: '/admin/users', label: 'Users', icon: 'user-cog' },
        { href: '/admin/students', label: 'Students', icon: 'academic' },
        { href: '/admin/backup', label: 'Backup & Restore', icon: 'database' },
      ],
    },
  ],
}

function Icon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    home: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    document: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    plus: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />,
    users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
    'user-cog': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
    academic: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />,
    wallet: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12V7H5a2 2 0 010-4h12v4M3 5v14a2 2 0 002 2h16v-5M18 12a2 2 0 000 4h4v-4h-4z" />,
    database: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7c0-1.657 3.582-3 8-3s8 1.343 8 3-3.582 3-8 3-8-1.343-8-3zm0 0v10c0 1.657 3.582 3 8 3s8-1.343 8-3V7m-16 5c0 1.657 3.582 3 8 3s8-1.343 8-3" />,
    logout: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />,
    menu: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />,
    x: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />,
    chevron: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />,
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {icons[name]}
    </svg>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.user) setUser(d.user) })
      .catch(() => router.push('/login'))
  }, [router])

  // Auto-expand any group that contains the current page on first load
  useEffect(() => {
    if (!user) return
    const items = NAV_ITEMS[user.role as keyof typeof NAV_ITEMS] || []
    const initial: Record<string, boolean> = {}
    items.forEach(entry => {
      if (entry.type === 'group') {
        const containsActive = entry.items.some(
          i => pathname === i.href || pathname.startsWith(i.href + '/')
        )
        initial[entry.label] = openGroups[entry.label] ?? true
        if (containsActive) initial[entry.label] = true
      }
    })
    setOpenGroups(prev => ({ ...initial, ...prev, ...(Object.keys(prev).length ? {} : initial) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    toast.success('Signed out')
  }

  function toggleGroup(label: string) {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const navItems = user ? (NAV_ITEMS[user.role as keyof typeof NAV_ITEMS] || []) : []

  const roleLabel: Record<string, string> = {
    requester: 'Requester',
    approver: 'Approver',
    admin: 'Administrator',
  }

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">Asiana Hub</p>
            <p className="text-slate-400 text-xs mt-0.5">Staff Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(entry => {
          if (entry.type === 'link') {
            const active = isActive(entry.href)
            return (
              <Link
                key={entry.href}
                href={entry.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon name={entry.icon} className="w-4 h-4 shrink-0" />
                {entry.label}
              </Link>
            )
          }

          // Group
          const isOpen = openGroups[entry.label] ?? true
          const groupHasActive = entry.items.some(i => isActive(i.href))

          return (
            <div key={entry.label}>
              <button
                onClick={() => toggleGroup(entry.label)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  groupHasActive && !isOpen
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon name={entry.icon} className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{entry.label}</span>
                <Icon
                  name="chevron"
                  className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="mt-0.5 ml-3 pl-3 border-l border-slate-700 space-y-0.5">
                  {entry.items.map(item => {
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? 'bg-brand-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <Icon name={item.icon} className="w-4 h-4 shrink-0" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-slate-800 space-y-0.5">
        {user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-white text-sm font-medium truncate">{user.name}</p>
            <p className="text-slate-400 text-xs">{roleLabel[user.role] || user.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Icon name="logout" className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 lg:w-60 bg-slate-900 flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 w-64 h-full bg-slate-900 flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-100">
            <Icon name="menu" className="w-5 h-5 text-slate-600" />
          </button>
          <span className="font-semibold text-slate-900 text-sm">Asiana Hub</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
