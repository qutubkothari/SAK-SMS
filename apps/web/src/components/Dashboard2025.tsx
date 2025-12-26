import { useState, useEffect } from 'react'
import { 
  Users, UserPlus, Activity, CheckCircle, AlertCircle, Briefcase, 
  TrendingUp, Flame, MessageSquare, Phone, Mail, BarChart3, 
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
  recentActivity: Array<{
    id: string
    name: string
    heat: 'ON_FIRE' | 'VERY_HOT' | 'HOT' | 'WARM' | 'COLD'
    channel: 'whatsapp' | 'phone' | 'email'
    status: string
    time: string
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

// Activity Card
interface ActivityCardProps {
  name: string
  heat: 'ON_FIRE' | 'VERY_HOT' | 'HOT' | 'WARM' | 'COLD'
  channel: 'whatsapp' | 'phone' | 'email'
  status: string
  time: string
}

const ActivityCard = ({ name, heat, channel, status, time }: ActivityCardProps) => {
  const heatColors = {
    'ON_FIRE': 'from-red-500 to-orange-500',
    'VERY_HOT': 'from-orange-500 to-amber-500',
    'HOT': 'from-amber-500 to-yellow-500',
    'WARM': 'from-yellow-500 to-lime-500',
    'COLD': 'from-slate-400 to-slate-500',
  }

  const channelIcons = {
    whatsapp: MessageSquare,
    phone: Phone,
    email: Mail,
  }

  const ChannelIcon = channelIcons[channel]

  return (
    <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-white/20 hover:border-mint-200 transition-all hover:scale-[1.01]">
      <div className="flex items-center space-x-4">
        {/* Heat Indicator */}
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${heatColors[heat]} flex items-center justify-center`}>
          <Flame className="w-6 h-6 text-white" />
        </div>

        {/* Details */}
        <div>
          <p className="font-semibold text-slate-900">{name}</p>
          <div className="flex items-center space-x-2 mt-1">
            <ChannelIcon className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-600">{status}</span>
            <span className="text-sm text-slate-400">• {time}</span>
          </div>
        </div>
      </div>

      <ChevronRight className="w-5 h-5 text-slate-400" />
    </div>
  )
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
    recentActivity: []
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
          recentActivity: data.recentActivity || []
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
            <div className="h-48 flex items-center justify-center text-slate-400">
              Chart visualization here
            </div>
          </div>

          {/* Leads by Heat */}
          <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-white/20 animate-slide-up" style={{ animationDelay: '700ms' }}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Leads by Heat</h3>
            </div>
            <div className="h-48 flex items-center justify-center text-slate-400">
              Chart visualization here
            </div>
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
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.slice(0, 5).map((activity) => (
                <ActivityCard key={activity.id} {...activity} />
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
