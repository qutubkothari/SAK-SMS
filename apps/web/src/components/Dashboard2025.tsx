import { useState, useEffect } from 'react'
import { 
  Users, UserPlus, Activity, CheckCircle, AlertCircle, Briefcase, 
  TrendingUp, Flame, BarChart3, 
  ChevronRight, Bell, X
} from 'lucide-react'
import { getDashboardStats } from '../lib/api'

interface DashboardStats {
  totalLeads: number
  newLeads: number
  activeLeads: number
  convertedLeads: number
  totalTriageOpen: number
  totalSalesmen: number
  leadsByStatus: Array<{ status: string; count: number }>
  leadsByHeat: Array<{ heat: string; count: number }>
  leadsByChannel: Array<{ channel: string; count: number }>
  recentSuccessEvents: Array<{
    id: string
    createdAt: string
    type: string
    weight: number
    definition?: { id: string; name: string; type: string; weight: number } | null
    lead?: { fullName: string | null; phone: string | null } | null
  }>
}

interface Dashboard2025Props {
  onError?: (error: string) => void
}

// 2025 Button Component with Shine Effect
interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  onClick?: () => void
  className?: string
}

const Button2025 = ({ children, variant = 'primary', onClick, className = '' }: ButtonProps) => {
  const baseClasses = "relative overflow-hidden px-6 py-3 rounded-2xl font-medium transition-all duration-200 active:scale-95 hover:scale-105"
  
  const variantClasses = {
    primary: "bg-mint-500 text-white shadow-mint-md hover:shadow-mint-lg",
    secondary: "bg-lemon-500 text-slate-900 shadow-lemon-md hover:shadow-lemon-md",
    ghost: "bg-white/70 backdrop-blur-md text-slate-700 border border-white/20 hover:bg-white/90"
  }

  return (
    <button 
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      <span className="relative z-10">{children}</span>
      {/* Shine effect */}
      <div className="absolute inset-0 -translate-x-full animate-shine bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    </button>
  )
}

// Bento Card Component
interface BentoCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  gradient: string
  trend?: string
  delay?: number
}

const BentoCard = ({ title, value, icon: Icon, gradient, trend, delay = 0 }: BentoCardProps) => {
  return (
    <div 
      className="group relative bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-white/20 hover:border-mint-200 transition-all duration-300 hover:scale-[1.02] hover:shadow-soft-lg animate-scale-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Gradient Background on Hover */}
      <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      
      <div className="relative z-10 flex flex-col space-y-4">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-soft`}>
          <Icon className="w-7 h-7 text-white" />
        </div>

        {/* Value */}
        <div>
          <p className="text-4xl font-bold text-slate-900">{value}</p>
          <p className="text-sm font-medium text-slate-600 mt-1">{title}</p>
        </div>

        {/* Trend */}
        {trend && (
          <div className="flex items-center space-x-1 text-mint-600">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">{trend}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Enterprise Modal
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

const EnterpriseModal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-soft-lg animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-lemon-500 flex items-center justify-center">
              <Bell className="w-5 h-5 text-slate-900" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6 text-slate-600">
          {children}
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <Button2025 variant="primary" className="flex-1">
            Confirm
          </Button2025>
          <Button2025 variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button2025>
        </div>
      </div>
    </div>
  )
}

function formatRelativeTime(iso: string) {
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ''
  const diffMs = Date.now() - ts
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

function normalizeCounts(items: Array<{ key: string; count: number }>) {
  const max = Math.max(...items.map((x) => x.count), 1)
  return { items, max }
}

// Main Dashboard Component
export function Dashboard2025({ onError }: Dashboard2025Props) {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    newLeads: 0,
    activeLeads: 0,
    convertedLeads: 0,
    totalTriageOpen: 0,
    totalSalesmen: 0,
    leadsByStatus: [],
    leadsByHeat: [],
    leadsByChannel: [],
    recentSuccessEvents: []
  })
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  // Fetch stats on mount
  useEffect(() => {
    getDashboardStats()
      .then(data => {
        setStats({
          totalLeads: data.totalLeads || 0,
          newLeads: data.newLeads || 0,
          activeLeads: data.activeLeads || 0,
          convertedLeads: data.convertedLeads || 0,
          totalTriageOpen: data.totalTriageOpen || 0,
          totalSalesmen: data.totalSalesmen || 0,
          leadsByStatus: data.leadsByStatus || [],
          leadsByHeat: data.leadsByHeat || [],
          leadsByChannel: data.leadsByChannel || [],
          recentSuccessEvents: data.recentSuccessEvents || []
        })
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch dashboard stats:', err)
        onError?.(err.message)
        setLoading(false)
      })
  }, [onError])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-mint-500 to-mint-600 animate-float" />
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-5xl font-bold text-slate-900 mb-2">
          Welcome back! 👋
        </h1>
        <p className="text-lg text-slate-600">
          Here's what's happening with your leads today.
        </p>
      </div>

        {/* Bento Grid Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <BentoCard
            title="Total Leads"
            value={stats.totalLeads}
            icon={Users}
            gradient="from-mint-500 to-mint-600"
            delay={0}
          />
          <BentoCard
            title="New Leads"
            value={stats.newLeads}
            icon={UserPlus}
            gradient="from-lemon-400 to-lemon-500"
            delay={100}
          />
          <BentoCard
            title="Active Leads"
            value={stats.activeLeads}
            icon={Activity}
            gradient="from-purple-500 to-pink-500"
            delay={200}
          />
          <BentoCard
            title="Converted"
            value={stats.convertedLeads}
            icon={CheckCircle}
            gradient="from-emerald-500 to-green-500"
            delay={300}
          />
          <BentoCard
            title="Open Triage"
            value={stats.totalTriageOpen}
            icon={AlertCircle}
            gradient="from-red-500 to-rose-500"
            delay={400}
          />
          <BentoCard
            title="Salesmen"
            value={stats.totalSalesmen}
            icon={Briefcase}
            gradient="from-indigo-500 to-blue-500"
            delay={500}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Leads by Status */}
          <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-white/20 animate-slide-up" style={{ animationDelay: '600ms' }}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Leads by Status</h3>
            </div>
            {stats.leadsByStatus.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400">No data</div>
            ) : (
              (() => {
                const rows = stats.leadsByStatus
                  .map((x: any) => ({ key: String(x.status ?? 'UNKNOWN'), count: Number(x.count ?? 0) }))
                  .filter((x) => Number.isFinite(x.count) && x.count > 0)
                  .sort((a, b) => b.count - a.count)
                const { max } = normalizeCounts(rows)
                return (
                  <div className="space-y-3">
                    {rows.slice(0, 8).map((row) => (
                      <div key={row.key} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{row.key}</span>
                          <span className="font-semibold text-slate-900">{row.count}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-mint-400 to-mint-500"
                            style={{ width: `${Math.round((row.count / max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()
            )}
          </div>

          {/* Leads by Heat */}
          <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-white/20 animate-slide-up" style={{ animationDelay: '700ms' }}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Leads by Heat</h3>
            </div>
            {stats.leadsByHeat.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400">No data</div>
            ) : (
              (() => {
                const rows = stats.leadsByHeat
                  .map((x: any) => ({ key: String(x.heat ?? 'UNKNOWN'), count: Number(x.count ?? 0) }))
                  .filter((x) => Number.isFinite(x.count) && x.count > 0)
                  .sort((a, b) => b.count - a.count)
                const { max } = normalizeCounts(rows)
                return (
                  <div className="space-y-3">
                    {rows.slice(0, 8).map((row) => (
                      <div key={row.key} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{row.key}</span>
                          <span className="font-semibold text-slate-900">{row.count}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-400 to-red-500"
                            style={{ width: `${Math.round((row.count / max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-white/20 animate-slide-up" style={{ animationDelay: '800ms' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-slate-900">Recent Activity</h3>
            <Button2025 variant="ghost" onClick={() => setModalOpen(true)}>
              View All
            </Button2025>
          </div>
          <div className="space-y-3">
            {stats.recentSuccessEvents && stats.recentSuccessEvents.length > 0 ? (
              stats.recentSuccessEvents.slice(0, 5).map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-white/20 hover:border-mint-200 transition-all hover:scale-[1.01]"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {(ev.lead?.fullName || ev.lead?.phone || 'Lead')}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-slate-600">
                          {ev.definition?.name || ev.type}
                        </span>
                        <span className="text-sm text-slate-400">• {formatRelativeTime(ev.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              ))
            ) : (
              <p className="text-center text-slate-400 py-8">No recent activity</p>
            )}
          </div>
        </div>

        {/* Demo Buttons */}
        <div className="mt-8 flex flex-wrap gap-4 animate-fade-in">
          <Button2025 variant="primary">
            Primary Action
          </Button2025>
          <Button2025 variant="secondary">
            Secondary Action
          </Button2025>
          <Button2025 variant="ghost" onClick={() => setModalOpen(true)}>
            Open Modal
          </Button2025>
        </div>

      {/* Enterprise Modal */}
      <EnterpriseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Notification"
      >
        <p>This is an enterprise-grade modal with a clean, modern design. The backdrop uses a frosted glass effect for a premium feel.</p>
      </EnterpriseModal>
    </>
  )
}
