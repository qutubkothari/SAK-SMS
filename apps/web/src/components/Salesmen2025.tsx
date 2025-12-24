import { useState } from 'react'
import { Users, TrendingUp, Target, Award, Mail, Edit2, Save, X } from 'lucide-react'

type Salesman = {
  id: string
  displayName: string
  username: string
  role: string
  isActive: boolean
  stats?: {
    totalLeads?: number
    activeLeads?: number
    wonLeads?: number
    conversionRate?: number
  }
}

type Salesmen2025Props = {
  salesmen: Salesman[]
  onUpdate: (id: string, updates: { displayName: string; isActive: boolean }) => Promise<void>
  onRefresh: () => void
}

export function Salesmen2025({ salesmen, onUpdate, onRefresh }: Salesmen2025Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editActive, setEditActive] = useState(false)

  const handleEdit = (salesman: Salesman) => {
    setEditingId(salesman.id)
    setEditName(salesman.displayName)
    setEditActive(salesman.isActive)
  }

  const handleSave = async (id: string) => {
    await onUpdate(id, { displayName: editName, isActive: editActive })
    setEditingId(null)
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditName('')
    setEditActive(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-mint-600 to-mint-500 bg-clip-text text-transparent">
            Sales Team
          </h1>
          <p className="text-slate-600 mt-1">Manage your sales team and track performance</p>
        </div>
        <button
          onClick={onRefresh}
          className="px-6 py-3 bg-gradient-to-r from-mint-500 to-mint-600 text-white rounded-xl hover:shadow-mint-lg transform hover:scale-105 transition-all duration-200 font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-soft border border-white/20 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-mint-400 to-mint-500 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{salesmen.length}</div>
              <div className="text-sm text-slate-600">Total Salesmen</div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-soft border border-white/20 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {salesmen.filter(s => s.isActive).length}
              </div>
              <div className="text-sm text-slate-600">Active</div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-soft border border-white/20 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lemon-400 to-lemon-500 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {salesmen.reduce((sum, s) => sum + (s.stats?.activeLeads || 0), 0)}
              </div>
              <div className="text-sm text-slate-600">Active Leads</div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-soft border border-white/20 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {salesmen.reduce((sum, s) => sum + (s.stats?.wonLeads || 0), 0)}
              </div>
              <div className="text-sm text-slate-600">Total Wins</div>
            </div>
          </div>
        </div>
      </div>

      {/* Salesmen Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {salesmen.map((salesman, idx) => {
          const isEditing = editingId === salesman.id
          const conversionRate = salesman.stats?.conversionRate || 0

          return (
            <div
              key={salesman.id}
              className="bg-white/90 backdrop-blur-md rounded-2xl shadow-soft border border-white/20 overflow-hidden hover:shadow-soft-lg transform hover:scale-[1.02] transition-all duration-200 animate-fade-in"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              {/* Card Header with Gradient */}
              <div className={`h-24 bg-gradient-to-r ${
                salesman.isActive 
                  ? 'from-mint-400 to-mint-500' 
                  : 'from-slate-400 to-slate-500'
              } relative`}>
                <div className="absolute -bottom-10 left-6">
                  <div className="w-20 h-20 rounded-2xl bg-white shadow-soft-lg flex items-center justify-center">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${
                      salesman.isActive 
                        ? 'from-mint-400 to-mint-500' 
                        : 'from-slate-400 to-slate-500'
                    } flex items-center justify-center text-white text-2xl font-bold`}>
                      {salesman.displayName.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </div>
                
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    salesman.isActive 
                      ? 'bg-green-100 text-green-700 border border-green-300' 
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}>
                    {salesman.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Card Content */}
              <div className="pt-14 p-6">
                {isEditing ? (
                  <div className="space-y-3 mb-4">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-transparent"
                      placeholder="Display name"
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                        className="w-4 h-4 text-mint-600 rounded focus:ring-mint-500"
                      />
                      <span className="text-sm text-slate-700">Active</span>
                    </label>
                  </div>
                ) : (
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-slate-900 mb-1">
                      {salesman.displayName}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4" />
                      {salesman.username}
                    </div>
                    <div className="mt-2">
                      <span className="px-2 py-1 bg-mint-50 text-mint-700 rounded-lg text-xs font-medium border border-mint-200">
                        {salesman.role}
                      </span>
                    </div>
                  </div>
                )}

                {/* Stats */}
                {!isEditing && salesman.stats && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-mint-50 rounded-xl p-3 border border-mint-100">
                      <div className="text-xs text-mint-600 mb-1">Total Leads</div>
                      <div className="text-lg font-bold text-mint-900">
                        {salesman.stats.totalLeads || 0}
                      </div>
                    </div>
                    <div className="bg-lemon-50 rounded-xl p-3 border border-lemon-100">
                      <div className="text-xs text-lemon-600 mb-1">Active</div>
                      <div className="text-lg font-bold text-lemon-900">
                        {salesman.stats.activeLeads || 0}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                      <div className="text-xs text-green-600 mb-1">Won</div>
                      <div className="text-lg font-bold text-green-900">
                        {salesman.stats.wonLeads || 0}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                      <div className="text-xs text-purple-600 mb-1">Rate</div>
                      <div className="text-lg font-bold text-purple-900">
                        {conversionRate.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                )}

                {/* Performance Bar */}
                {!isEditing && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                      <span>Conversion Rate</span>
                      <span className="font-semibold">{conversionRate.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${
                          conversionRate >= 30 
                            ? 'from-green-400 to-green-500' 
                            : conversionRate >= 15 
                            ? 'from-lemon-400 to-lemon-500' 
                            : 'from-orange-400 to-orange-500'
                        } transition-all duration-500`}
                        style={{ width: `${Math.min(conversionRate, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => handleSave(salesman.id)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-mint-500 to-mint-600 text-white rounded-xl hover:shadow-mint-md transition-all duration-200 flex items-center justify-center gap-2 font-medium"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleEdit(salesman)}
                      className="flex-1 px-4 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {salesmen.length === 0 && (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-soft border border-white/20 p-12 text-center">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Salesmen Yet</h3>
          <p className="text-slate-600">Add salesmen to start managing your sales team.</p>
        </div>
      )}
    </div>
  )
}
