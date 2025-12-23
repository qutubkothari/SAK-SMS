import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Settings, Bell, Search, LogOut, User } from 'lucide-react'

interface AppLayout2025Props {
  children: React.ReactNode
  user?: {
    name?: string
    phone?: string
    role?: string
  } | null
  onLogout?: () => void
}

export function AppLayout2025({ children, user, onLogout }: AppLayout2025Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = [
    { to: '/', label: 'Dashboard' },
    { to: '/leads', label: 'Leads' },
    { to: '/triage', label: 'Triage' },
    { to: '/salesmen', label: 'Salesmen' },
    { to: '/reports', label: 'Reports' },
    { to: '/activity-feed', label: 'Activity' },
    ...(user?.role === 'ADMIN' ? [{ to: '/audit-logs', label: 'Audit' }] : []),
    { to: '/success', label: 'Success' },
    { to: '/settings', label: 'Settings' },
    { to: '/ai', label: 'AI' },
    { to: '/bots', label: 'Bots' },
    { to: '/ingest', label: 'Ingest' },
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mint-50 via-white to-lemon-50">
      {/* Floating Island Navbar */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl animate-slide-up">
        <div className="bg-white/70 backdrop-blur-md rounded-3xl px-6 py-4 shadow-soft-lg border border-white/20">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-mint-500 to-mint-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-slate-900">SAK CRM</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center space-x-2">
              {navItems.slice(0, 6).map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    isActive(item.to)
                      ? 'bg-mint-500 text-white shadow-mint-sm'
                      : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* More Menu */}
              <div className="relative">
                <button className="px-4 py-2 rounded-xl font-medium text-slate-600 hover:bg-white/50 transition-all">
                  More
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              <button className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center hover:bg-white transition-colors">
                <Search className="w-5 h-5 text-slate-600" />
              </button>
              <button className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center hover:bg-white transition-colors relative">
                <Bell className="w-5 h-5 text-slate-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-lemon-500 rounded-full" />
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-white/50 hover:bg-white transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-mint-500 to-mint-600 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="hidden md:block text-sm font-medium text-slate-700">
                    {user?.name || user?.phone || 'Admin'}
                  </span>
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white/90 backdrop-blur-md rounded-2xl shadow-soft-lg border border-white/20 p-2 z-50 animate-scale-in">
                      <div className="px-3 py-2 border-b border-slate-200">
                        <p className="text-sm font-semibold text-slate-900">
                          {user?.name || 'User'}
                        </p>
                        <p className="text-xs text-slate-500">{user?.phone}</p>
                        <p className="text-xs text-mint-600 font-medium mt-1">
                          {user?.role || 'Admin'}
                        </p>
                      </div>
                      <Link
                        to="/settings"
                        className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors mt-1"
                      >
                        <Settings className="w-4 h-4 text-slate-600" />
                        <span className="text-sm text-slate-700">Settings</span>
                      </Link>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false)
                          onLogout?.()
                          navigate('/login')
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors text-red-600"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                className="lg:hidden w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-4 pt-4 border-t border-slate-200 space-y-2 animate-fade-in">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-2xl font-medium transition-all ${
                    isActive(item.to)
                      ? 'bg-mint-500 text-white'
                      : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
