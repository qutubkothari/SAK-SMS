import { useEffect, useState } from 'react'
import { getDashboardStats } from '../lib/api'
import { 
  Users, 
  UserPlus, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  Briefcase,
  TrendingUp,
  Flame,
  MessageSquare,
  Phone,
  Mail,
  BarChart3,
  RefreshCw
} from 'lucide-react'

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
}

interface DashboardProps {
  onError: (message: string) => void
}

export function Dashboard({ onError }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    try {
      const data = await getDashboardStats()
      setStats(data)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Leads',
      value: stats.totalLeads,
      icon: Users,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950'
    },
    {
      title: 'New Leads',
      value: stats.newLeads,
      icon: UserPlus,
      gradient: 'from-amber-500 to-orange-500',
      bgGradient: 'from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950'
    },
    {
      title: 'Active Leads',
      value: stats.activeLeads,
      icon: Activity,
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950'
    },
    {
      title: 'Converted',
      value: stats.convertedLeads,
      icon: CheckCircle,
      gradient: 'from-emerald-500 to-green-500',
      bgGradient: 'from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950'
    },
    {
      title: 'Open Triage',
      value: stats.totalTriageOpen,
      icon: AlertCircle,
      gradient: 'from-red-500 to-rose-500',
      bgGradient: 'from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950'
    },
    {
      title: 'Salesmen',
      value: stats.totalSalesmen,
      icon: Briefcase,
      gradient: 'from-indigo-500 to-blue-500',
      bgGradient: 'from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950'
    }
  ]

  const heatColorMap: Record<string, string> = {
    'ON_FIRE': 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300',
    'VERY_HOT': 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-300',
    'HOT': 'text-amber-600 bg-amber-100 dark:bg-amber-900 dark:text-amber-300',
    'WARM': 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300',
    'COLD': 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300'
  }

  const channelIcons: Record<string, any> = {
    'WHATSAPP': MessageSquare,
    'CALL': Phone,
    'EMAIL': Mail,
    'WEB': BarChart3
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary hover:shadow-lg transition-all duration-200"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="font-medium">Refresh</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className="glass-card p-6 hover:scale-[1.02] transition-all duration-300 animate-slide-in relative overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-50`} />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                    {card.value}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Data Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads by Status */}
        <div className="glass-card p-6 animate-slide-in" style={{ animationDelay: '600ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Leads by Status</h3>
          </div>
          <div className="space-y-3">
            {(stats.leadsByStatus ?? []).map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200"
              >
                <span className="font-medium text-sm">{item.status}</span>
                <span className="px-3 py-1 rounded-full bg-gradient-primary text-white text-sm font-semibold">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Leads by Heat */}
        <div className="glass-card p-6 animate-slide-in" style={{ animationDelay: '700ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Leads by Heat</h3>
          </div>
          <div className="space-y-3">
            {(stats.leadsByHeat ?? []).map((item) => (
              <div
                key={item.heat}
                className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="font-medium text-sm">{item.heat}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${heatColorMap[item.heat] || 'bg-gray-100 text-gray-600'}`}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Leads by Channel */}
        <div className="glass-card p-6 animate-slide-in" style={{ animationDelay: '800ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Leads by Channel</h3>
          </div>
          <div className="space-y-3">
            {(stats.leadsByChannel ?? []).map((item) => {
              const ChannelIcon = channelIcons[item.channel] || BarChart3
              return (
                <div
                  key={item.channel}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <ChannelIcon className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">{item.channel}</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-gradient-success text-white text-sm font-semibold">
                    {item.count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
