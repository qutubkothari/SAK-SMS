import { Calendar, FileText, Phone, CheckCircle, Activity, RefreshCw } from 'lucide-react'

interface ActivityItem {
  type: 'event' | 'note' | 'call' | 'task' | string
  time: string
  data: {
    leadName?: string
    outcome?: string
    message?: string
    body?: string
    userName?: string
    answered?: boolean
    duration?: number
    completed?: boolean
    title?: string
  }
}

interface ActivityFeed2025Props {
  feed: ActivityItem[]
  loading: boolean
  limit: number
  onLimitChange: (limit: number) => void
  onRefresh: () => void
}

export function ActivityFeed2025({ feed, loading, limit, onLimitChange, onRefresh }: ActivityFeed2025Props) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'event': return Calendar
      case 'note': return FileText
      case 'call': return Phone
      case 'task': return CheckCircle
      default: return Activity
    }
  }

  const getTypeColors = (type: string) => {
    switch (type) {
      case 'event':
        return { bg: 'from-blue-400 to-blue-500', badge: 'bg-blue-100 text-blue-700 border-blue-200' }
      case 'note':
        return { bg: 'from-purple-400 to-purple-500', badge: 'bg-purple-100 text-purple-700 border-purple-200' }
      case 'call':
        return { bg: 'from-mint-400 to-mint-500', badge: 'bg-mint-100 text-mint-700 border-mint-200' }
      case 'task':
        return { bg: 'from-lemon-400 to-lemon-500', badge: 'bg-lemon-100 text-lemon-700 border-lemon-200' }
      default:
        return { bg: 'from-slate-400 to-slate-500', badge: 'bg-slate-100 text-slate-700 border-slate-200' }
    }
  }

  const formatTime = (time: string) => {
    const date = new Date(time)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen p-8 pt-24 bg-gradient-to-br from-mint-50 via-white to-lemon-50">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">Activity Feed</h1>
            <p className="text-slate-600">Real-time activity stream</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="px-4 py-2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-mint-500 hover:bg-white transition-all"
            >
              <option value={25}>Last 25</option>
              <option value={50}>Last 50</option>
              <option value={100}>Last 100</option>
            </select>

            <button
              onClick={onRefresh}
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-mint-400 to-mint-500 text-white font-medium rounded-xl hover:from-mint-500 hover:to-mint-600 transition-all shadow-mint-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Activity Timeline */}
        {loading && feed.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-mint-100 to-mint-200 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-mint-600 animate-spin" />
              </div>
              <p className="text-slate-600 font-medium">Loading activity...</p>
            </div>
          </div>
        ) : feed.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <Activity className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No activity yet</p>
              <p className="text-slate-500 text-sm mt-1">Activity will appear here as it happens</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {feed.map((item, idx) => {
              const Icon = getIcon(item.type)
              const colors = getTypeColors(item.type)

              return (
                <div
                  key={idx}
                  className="group bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-5 hover:shadow-soft-lg transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase border ${colors.badge}`}>
                            {item.type}
                          </span>
                          {item.data.leadName && (
                            <span className="font-semibold text-slate-800">
                              {item.data.leadName}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-slate-500 whitespace-nowrap">
                          {formatTime(item.time)}
                        </span>
                      </div>

                      <div className="text-slate-700 text-sm leading-relaxed">
                        {item.type === 'event' && (
                          <div>
                            <span className="font-semibold text-slate-800">{item.data.outcome}</span>
                            {item.data.message && <span> - {item.data.message}</span>}
                            {item.data.userName && (
                              <span className="text-slate-500"> by {item.data.userName}</span>
                            )}
                          </div>
                        )}

                        {item.type === 'note' && (
                          <div>
                            <span>{item.data.body}</span>
                            {item.data.userName && (
                              <span className="text-slate-500"> — {item.data.userName}</span>
                            )}
                          </div>
                        )}

                        {item.type === 'call' && (
                          <div>
                            <span className="font-semibold text-slate-800">
                              {item.data.answered ? '✓ Answered' : '✗ Missed'}
                            </span>
                            <span> call</span>
                            {item.data.duration && (
                              <span className="text-mint-600 font-medium">
                                {' '}— {Math.floor(item.data.duration / 60)}m {item.data.duration % 60}s
                              </span>
                            )}
                            {item.data.userName && (
                              <span className="text-slate-500"> by {item.data.userName}</span>
                            )}
                          </div>
                        )}

                        {item.type === 'task' && (
                          <div>
                            <span className="font-semibold text-slate-800">
                              {item.data.completed ? '✓ Completed' : '+ Created'}
                            </span>
                            <span>: {item.data.title}</span>
                            {item.data.userName && (
                              <span className="text-slate-500"> by {item.data.userName}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Load More Hint */}
        {feed.length >= limit && (
          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              Showing {feed.length} activities. Select a higher limit to see more.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
