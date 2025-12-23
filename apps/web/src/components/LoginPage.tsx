import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, type SessionUser } from '../lib/api'

interface LoginPageProps {
  onError: (message: string) => void
  onLoggedIn: (user: SessionUser) => void
}

export function LoginPage({ onError, onLoggedIn }: LoginPageProps) {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      const out = await login({ phone, password })
      onLoggedIn(out.user)
      navigate('/')
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden bg-gradient-to-br from-mint-50 via-white to-lemon-50">
      {/* Animated background blobs - Mint & Lemon themed */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-mint-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-float" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-lemon-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-mint-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Login card with 2025 glassmorphism */}
      <div className="bg-white/70 backdrop-blur-md w-full max-w-md p-10 sm:p-12 rounded-3xl border border-white/20 shadow-soft-lg animate-scale-in relative z-10">
        <div className="text-center mb-8">
          {/* Logo with Mint gradient */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-mint-500 to-mint-600 flex items-center justify-center shadow-mint-md">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-4xl font-bold mb-2 text-slate-900">
            SAK CRM
          </h1>
          <p className="text-sm text-slate-600">
            Sign in to your account
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-semibold block text-slate-700">
              Mobile Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9537653927"
              className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-slate-200 focus:border-mint-500 focus:ring-2 focus:ring-mint-500/20 outline-none transition-all duration-200 text-slate-900 placeholder:text-slate-400"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-semibold block text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-slate-200 focus:border-mint-500 focus:ring-2 focus:ring-mint-500/20 outline-none transition-all duration-200 text-slate-900 placeholder:text-slate-400"
              disabled={isLoading}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleLogin()
                }
              }}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="relative overflow-hidden w-full bg-gradient-to-br from-mint-500 to-mint-600 text-white py-3.5 rounded-2xl font-semibold shadow-mint-md hover:shadow-mint-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-6"
          >
            <span className="relative z-10">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </span>
            {/* Shine effect */}
            <div className="absolute inset-0 -translate-x-full animate-shine bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </button>
        </div>

        <div className="mt-6 text-xs text-center text-slate-500">
          Need help? Contact your administrator
        </div>
      </div>
    </div>
  )
}
