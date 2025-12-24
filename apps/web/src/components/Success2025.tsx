import { Award, TrendingUp, Plus, RefreshCw, Save, Target } from 'lucide-react'

interface SuccessDefinition {
  id: string
  name: string
  type: 'DEMO_BOOKED' | 'PAYMENT_RECEIVED' | 'ORDER_RECEIVED' | 'CONTRACT_SIGNED' | 'CUSTOM'
  weight: number
  isActive: boolean
}

interface SuccessAnalytics {
  days: number
  eventsByType: { type: string; count: number; weight: number }[]
  leadStatusCounts: { status: string; count: number }[]
  leadHeatCounts: { heat: string; count: number }[]
  leaderboard: { salesmanId: string; displayName: string; events: number; weight: number }[]
}

interface Success2025Props {
  definitions: SuccessDefinition[]
  analytics: SuccessAnalytics | null
  newDefinition: {
    name: string
    type: 'DEMO_BOOKED' | 'PAYMENT_RECEIVED' | 'ORDER_RECEIVED' | 'CONTRACT_SIGNED' | 'CUSTOM'
    weight: number
  }
  onNewDefinitionChange: (field: 'name' | 'type' | 'weight', value: any) => void
  onDefinitionChange: (id: string, field: 'name' | 'weight' | 'isActive', value: any) => void
  onCreateDefinition: () => void
  onSaveDefinition: (id: string) => void
  onRecomputeScores: () => void
  onRefresh: () => void
}

export function Success2025({
  definitions,
  analytics,
  newDefinition,
  onNewDefinitionChange,
  onDefinitionChange,
  onCreateDefinition,
  onSaveDefinition,
  onRecomputeScores,
  onRefresh,
}: Success2025Props) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'DEMO_BOOKED':
        return 'bg-mint-100 text-mint-700 border-mint-200'
      case 'PAYMENT_RECEIVED':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'ORDER_RECEIVED':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'CONTRACT_SIGNED':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      default:
        return 'bg-lemon-100 text-lemon-700 border-lemon-200'
    }
  }

  const getWeightColor = (weight: number) => {
    if (weight >= 50) return 'bg-green-100 text-green-700 border-green-200'
    if (weight >= 20) return 'bg-lemon-100 text-lemon-700 border-lemon-200'
    return 'bg-orange-100 text-orange-700 border-orange-200'
  }

  return (
    <div className="min-h-screen p-8 pt-24 bg-gradient-to-br from-mint-50 via-white to-lemon-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-mint-400 to-mint-500 flex items-center justify-center shadow-md">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-800">Success Definitions</h1>
              <p className="text-slate-600">Configure what success means for your team</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onRecomputeScores}
              className="px-4 py-2 bg-gradient-to-r from-lemon-400 to-lemon-500 text-slate-800 font-medium rounded-xl hover:from-lemon-500 hover:to-lemon-600 transition-all shadow-lemon-md flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Recompute Scores
            </button>
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-gradient-to-r from-mint-400 to-mint-500 text-white font-medium rounded-xl hover:from-mint-500 hover:to-mint-600 transition-all shadow-mint-md flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Analytics */}
        {analytics && (
          <div className="mb-8 bg-white/90 backdrop-blur-md border border-mint-200 rounded-2xl p-6 shadow-soft">
            <div className="flex items-center gap-2 mb-6">
              <Award className="w-5 h-5 text-mint-600" />
              <h2 className="text-2xl font-bold text-slate-800">Analytics</h2>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold uppercase">
                Last {analytics.days} days
              </span>
            </div>

            {/* Events by Type */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Success Events</h3>
              {analytics.eventsByType.length === 0 ? (
                <p className="text-slate-500 text-sm">No success events in this window.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {analytics.eventsByType.map((evt) => (
                    <div
                      key={evt.type}
                      className="bg-gradient-to-br from-mint-50 to-white border border-mint-200 rounded-xl p-4 hover:shadow-soft transition-all"
                    >
                      <div className="text-xs text-slate-600 mb-1">{evt.type}</div>
                      <div className="text-2xl font-bold text-mint-700">{evt.count}</div>
                      <div className="text-xs text-slate-500 mt-1">Weight: {evt.weight}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status & Heat Counts */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Leads by Status</h3>
                <div className="flex gap-2 flex-wrap">
                  {analytics.leadStatusCounts.map((s) => (
                    <span key={s.status} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                      {s.status} {s.count}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Leads by Heat</h3>
                <div className="flex gap-2 flex-wrap">
                  {analytics.leadHeatCounts.map((h) => (
                    <span key={h.heat} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                      {h.heat} {h.count}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Leaderboard */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Top Performers (by success weight)</h3>
              {analytics.leaderboard.length === 0 ? (
                <p className="text-slate-500 text-sm">No salesman events yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-mint-200">
                        <th className="text-left py-2 pr-4 font-semibold text-slate-700">Salesman</th>
                        <th className="text-left py-2 pr-4 font-semibold text-slate-700">Events</th>
                        <th className="text-left py-2 font-semibold text-slate-700">Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.leaderboard.map((r) => (
                        <tr key={r.salesmanId} className="border-b border-mint-100">
                          <td className="py-3 pr-4 font-medium text-slate-800">{r.displayName}</td>
                          <td className="py-3 pr-4 text-slate-600">{r.events}</td>
                          <td className="py-3">
                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getWeightColor(r.weight)}`}>
                              {r.weight.toFixed(0)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Definition */}
        <div className="mb-6 bg-white/90 backdrop-blur-md border border-lemon-200 rounded-2xl p-6 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5 text-lemon-600" />
            <h2 className="text-xl font-bold text-slate-800">Create New Definition</h2>
          </div>

          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                value={newDefinition.name}
                onChange={(e) => onNewDefinitionChange('name', e.target.value)}
                placeholder="e.g., Demo booked"
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lemon-500"
              />
            </div>

            <div className="min-w-[180px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={newDefinition.type}
                onChange={(e) => onNewDefinitionChange('type', e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lemon-500"
              >
                {['DEMO_BOOKED', 'PAYMENT_RECEIVED', 'ORDER_RECEIVED', 'CONTRACT_SIGNED', 'CUSTOM'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[120px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Weight</label>
              <input
                type="number"
                min={0}
                max={1000}
                step={1}
                value={newDefinition.weight}
                onChange={(e) => onNewDefinitionChange('weight', Number(e.target.value))}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lemon-500"
              />
            </div>

            <button
              onClick={onCreateDefinition}
              className="px-6 py-2 bg-gradient-to-r from-lemon-400 to-lemon-500 text-slate-800 font-medium rounded-xl hover:from-lemon-500 hover:to-lemon-600 transition-all shadow-lemon-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
          </div>
        </div>

        {/* Definitions List */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl shadow-soft overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">Success Definitions</h2>
            <p className="text-slate-600 text-sm mt-1">
              Each tenant can define what "success" means. Salesman scores are normalized to 0–100 based on success events in the last 30 days.
            </p>
          </div>

          {definitions.length === 0 ? (
            <div className="p-8 text-center">
              <Target className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-600 font-medium">No definitions yet</p>
              <p className="text-slate-500 text-sm mt-1">Create your first success definition above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Weight</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Active</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {definitions.map((def, idx) => (
                    <tr
                      key={def.id}
                      className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          value={def.name}
                          onChange={(e) => onDefinitionChange(def.id, 'name', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase border ${getTypeColor(def.type)}`}>
                          {def.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          max={1000}
                          step={1}
                          value={def.weight}
                          onChange={(e) => onDefinitionChange(def.id, 'weight', Number(e.target.value))}
                          className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={def.isActive}
                            onChange={(e) => onDefinitionChange(def.id, 'isActive', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-mint-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-mint-500"></div>
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${def.isActive ? 'bg-mint-100 text-mint-700 border-mint-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {def.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                          <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${getWeightColor(def.weight)}`}>
                            WT {def.weight}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onSaveDefinition(def.id)}
                          className="px-4 py-1.5 bg-gradient-to-r from-mint-400 to-mint-500 text-white text-xs font-medium rounded-lg hover:from-mint-500 hover:to-mint-600 transition-all shadow-mint-sm flex items-center gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
