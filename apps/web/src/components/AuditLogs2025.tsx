import { Shield, Search, RefreshCw, X } from 'lucide-react'

interface AuditLog {
  createdAt: string
  userId?: string
  action: string
  entityType: string
  entityId?: string
  changes?: any
  ipAddress?: string
}

interface AuditLogs2025Props {
  logs: AuditLog[]
  loading: boolean
  limit: number
  entityType: string
  entityId: string
  onLimitChange: (limit: number) => void
  onEntityTypeChange: (type: string) => void
  onEntityIdChange: (id: string) => void
  onClearFilters: () => void
  onRefresh: () => void
}

export function AuditLogs2025({
  logs,
  loading,
  limit,
  entityType,
  entityId,
  onLimitChange,
  onEntityTypeChange,
  onEntityIdChange,
  onClearFilters,
  onRefresh,
}: AuditLogs2025Props) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  const formatChanges = (changes: any) => {
    if (!changes) return 'N/A'
    try {
      const obj = typeof changes === 'string' ? JSON.parse(changes) : changes
      const entries = Object.entries(obj)
      if (entries.length === 0) return 'No changes'
      return entries.map(([key, val]) => `${key}: ${JSON.stringify(val)}`).join(', ')
    } catch {
      return JSON.stringify(changes)
    }
  }

  const getActionColor = (action: string) => {
    const actionLower = action.toLowerCase()
    if (actionLower.includes('create')) return 'bg-mint-100 text-mint-700 border-mint-200'
    if (actionLower.includes('update') || actionLower.includes('edit')) return 'bg-blue-100 text-blue-700 border-blue-200'
    if (actionLower.includes('delete')) return 'bg-red-100 text-red-700 border-red-200'
    if (actionLower.includes('assign')) return 'bg-purple-100 text-purple-700 border-purple-200'
    if (actionLower.includes('login') || actionLower.includes('auth')) return 'bg-lemon-100 text-lemon-700 border-lemon-200'
    return 'bg-slate-100 text-slate-700 border-slate-200'
  }

  return (
    <div className="min-h-screen p-8 pt-24 bg-gradient-to-br from-slate-50 via-white to-mint-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shadow-md">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-800">Audit Logs</h1>
              <p className="text-slate-600">System activity tracking</p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-slate-400 to-slate-500 text-white font-medium rounded-xl hover:from-slate-500 hover:to-slate-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="px-4 py-2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 hover:bg-white transition-all"
          >
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={250}>Last 250</option>
            <option value={500}>Last 500</option>
          </select>

          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={entityType}
              onChange={(e) => onEntityTypeChange(e.target.value)}
              placeholder="Filter by entity type..."
              className="w-full pl-10 pr-4 py-2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 hover:bg-white transition-all"
            />
          </div>

          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={entityId}
              onChange={(e) => onEntityIdChange(e.target.value)}
              placeholder="Filter by ID..."
              className="w-full pl-10 pr-4 py-2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 hover:bg-white transition-all"
            />
          </div>

          {(entityType || entityId) && (
            <button
              onClick={onClearFilters}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2 text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Logs Table */}
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-slate-600 animate-spin" />
              </div>
              <p className="text-slate-600 font-medium">Loading audit logs...</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <Shield className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No audit logs found</p>
              <p className="text-slate-500 text-sm mt-1">Try adjusting your filters</p>
            </div>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Time</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">User</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Entity</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Entity ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Changes</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors animate-fade-in ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      }`}
                      style={{ animationDelay: `${idx * 20}ms` }}
                    >
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-mint-50 text-mint-700 rounded-lg text-xs font-medium">
                          {log.userId?.slice(0, 8) || 'System'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase border ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{log.entityType}</td>
                      <td className="px-4 py-3">
                        <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono">
                          {log.entityId?.slice(0, 12) || 'N/A'}
                        </code>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-slate-600 text-xs truncate" title={formatChanges(log.changes)}>
                          {formatChanges(log.changes)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-500 text-xs">{log.ipAddress || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            {logs.length >= limit && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-center">
                <p className="text-slate-500 text-xs">
                  Showing {logs.length} logs. Increase limit to see more.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
