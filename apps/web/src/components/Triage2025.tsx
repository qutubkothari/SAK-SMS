import { useState, useMemo } from 'react'
import { Filter, Calendar, User, CheckCircle, AlertCircle } from 'lucide-react'

type TriageItem = {
  id: string
  type: string
  createdAt: string
  assignedTo?: string
  assignedToName?: string
  status: 'NEW' | 'IN_PROGRESS' | 'CLOSED'
  leadId?: string
  leadName?: string
  channel?: string
  message?: string
  closedReason?: string
}

type Triage2025Props = {
  items: TriageItem[]
  salesmen: Array<{ id: string; name: string }>
  onAssign: (itemId: string, salesmanId: string) => Promise<void>
  onClose: (itemId: string, reason: string) => Promise<void>
  onReopen: (itemId: string) => Promise<void>
  onRefresh: () => void
}

const statusConfig = {
  NEW: {
    label: 'New',
    icon: AlertCircle,
    bg: 'from-lemon-400 to-lemon-500',
    badge: 'bg-lemon-100 text-lemon-900 border-lemon-300',
    glow: 'shadow-lemon-md',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    icon: User,
    bg: 'from-mint-400 to-mint-500',
    badge: 'bg-mint-100 text-mint-900 border-mint-300',
    glow: 'shadow-mint-md',
  },
  CLOSED: {
    label: 'Closed',
    icon: CheckCircle,
    bg: 'from-slate-400 to-slate-500',
    badge: 'bg-slate-100 text-slate-900 border-slate-300',
    glow: 'shadow-soft',
  },
}

const channelIcons: Record<string, string> = {
  WHATSAPP: '💬',
  FACEBOOK: '👍',
  INSTAGRAM: '📷',
  PHONE: '📞',
  EMAIL: '📧',
  WEB: '🌐',
}

export function Triage2025({ items, salesmen, onAssign, onClose, onReopen, onRefresh }: Triage2025Props) {
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [assignedFilter, setAssignedFilter] = useState<string>('ALL')
  const [selectedItem, setSelectedItem] = useState<TriageItem | null>(null)
  const [closeReason, setCloseReason] = useState('')

  const filteredByStatus = useMemo(() => {
    const filtered = items.filter((item) => {
      const matchesType = typeFilter === 'ALL' || item.type === typeFilter
      const matchesAssigned = assignedFilter === 'ALL' || 
        (assignedFilter === 'UNASSIGNED' ? !item.assignedTo : item.assignedTo === assignedFilter)
      return matchesType && matchesAssigned
    })

    return {
      NEW: filtered.filter(i => i.status === 'NEW'),
      IN_PROGRESS: filtered.filter(i => i.status === 'IN_PROGRESS'),
      CLOSED: filtered.filter(i => i.status === 'CLOSED'),
    }
  }, [items, typeFilter, assignedFilter])

  const uniqueTypes = useMemo(() => {
    const types = new Set(items.map(i => i.type))
    return Array.from(types).sort()
  }, [items])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-mint-600 to-mint-500 bg-clip-text text-transparent">
            Triage Center
          </h1>
          <p className="text-slate-600 mt-1">Manage and assign incoming items</p>
        </div>
        <button
          onClick={onRefresh}
          className="px-6 py-3 bg-gradient-to-r from-mint-500 to-mint-600 text-white rounded-xl hover:shadow-mint-lg transform hover:scale-105 transition-all duration-200 font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-soft border border-white/20 p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-mint-600" />
            <span className="text-sm font-medium text-slate-700">Filters:</span>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-white/80 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-transparent transition-all"
          >
            <option value="ALL">All Types</option>
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {/* Assigned Filter */}
          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="px-4 py-2 bg-white/80 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-transparent transition-all"
          >
            <option value="ALL">All Assignments</option>
            <option value="UNASSIGNED">Unassigned</option>
            {salesmen.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-lemon-400 to-lemon-500"></div>
              <span className="text-slate-600">{filteredByStatus.NEW.length} New</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-mint-400 to-mint-500"></div>
              <span className="text-slate-600">{filteredByStatus.IN_PROGRESS.length} In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-slate-400 to-slate-500"></div>
              <span className="text-slate-600">{filteredByStatus.CLOSED.length} Closed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(['NEW', 'IN_PROGRESS', 'CLOSED'] as const).map((status) => {
          const config = statusConfig[status]
          const StatusIcon = config.icon
          const columnItems = filteredByStatus[status]

          return (
            <div
              key={status}
              className="bg-white/50 backdrop-blur-sm rounded-2xl border-2 border-white/30 overflow-hidden"
            >
              {/* Column Header */}
              <div className={`bg-gradient-to-r ${config.bg} p-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <StatusIcon className="w-5 h-5 text-white" />
                  <h3 className="text-lg font-bold text-white">{config.label}</h3>
                </div>
                <div className="px-3 py-1 bg-white/30 backdrop-blur-sm rounded-full text-sm font-bold text-white">
                  {columnItems.length}
                </div>
              </div>

              {/* Column Content */}
              <div className="p-4 space-y-3 min-h-[400px] max-h-[calc(100vh-400px)] overflow-y-auto">
                {columnItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <StatusIcon className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">No items {config.label.toLowerCase()}</p>
                  </div>
                ) : (
                  columnItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`bg-white/90 backdrop-blur-md rounded-xl p-4 ${config.glow} border border-white/20 hover:shadow-soft-lg transform hover:scale-[1.02] transition-all duration-200 cursor-pointer animate-fade-in`}
                      style={{ animationDelay: `${idx * 30}ms` }}
                      onClick={() => setSelectedItem(item)}
                    >
                      {/* Item Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{channelIcons[item.channel || 'WEB'] || '🌐'}</span>
                          <div>
                            <div className="font-semibold text-slate-900">{item.leadName || 'Unknown Lead'}</div>
                            <div className="text-xs text-slate-500">{item.type}</div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${config.badge}`}>
                          {config.label}
                        </span>
                      </div>

                      {/* Item Message */}
                      {item.message && (
                        <div className="mb-3 text-sm text-slate-600 line-clamp-2 bg-slate-50 rounded-lg p-2">
                          {item.message}
                        </div>
                      )}

                      {/* Item Footer */}
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                        {item.assignedToName && (
                          <div className="flex items-center gap-1 text-mint-600 font-medium">
                            <User className="w-3 h-3" />
                            {item.assignedToName}
                          </div>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2">
                        {status !== 'CLOSED' && !item.assignedTo && (
                          <select
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              if (e.target.value) {
                                onAssign(item.id, e.target.value)
                              }
                            }}
                            className="flex-1 px-3 py-1.5 bg-mint-50 border border-mint-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-mint-500"
                          >
                            <option value="">Assign to...</option>
                            {salesmen.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        )}
                        {status === 'IN_PROGRESS' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedItem(item)
                            }}
                            className="flex-1 px-3 py-1.5 bg-green-50 text-green-700 border border-green-300 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                          >
                            Close
                          </button>
                        )}
                        {status === 'CLOSED' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onReopen(item.id)
                            }}
                            className="flex-1 px-3 py-1.5 bg-lemon-50 text-lemon-700 border border-lemon-300 rounded-lg text-xs font-medium hover:bg-lemon-100 transition-colors"
                          >
                            Reopen
                          </button>
                        )}
                      </div>

                      {status === 'CLOSED' && item.closedReason && (
                        <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                          Reason: {item.closedReason}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Close Modal */}
      {selectedItem && selectedItem.status === 'IN_PROGRESS' && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-soft-lg max-w-md w-full p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-mint-600" />
              <h3 className="text-xl font-bold text-slate-900">Close Item</h3>
            </div>

            <div className="mb-4">
              <p className="text-slate-600 mb-2">Close item for:</p>
              <p className="font-semibold text-slate-900">{selectedItem.leadName || 'Unknown Lead'}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason for closing
              </label>
              <textarea
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="Enter reason..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedItem(null)
                  setCloseReason('')
                }}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (closeReason.trim()) {
                    await onClose(selectedItem.id, closeReason)
                    setSelectedItem(null)
                    setCloseReason('')
                  }
                }}
                disabled={!closeReason.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-mint-500 to-mint-600 text-white rounded-xl font-medium hover:shadow-mint-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Close Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
