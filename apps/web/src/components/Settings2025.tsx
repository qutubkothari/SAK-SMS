import { Settings as SettingsIcon, Save, CheckCircle, Info } from 'lucide-react'

interface AssignmentConfig {
  strategy: 'ROUND_ROBIN' | 'LEAST_ACTIVE' | 'SKILLS_BASED' | 'GEOGRAPHIC' | 'CUSTOM'
  autoAssign: boolean
  considerCapacity: boolean
  considerScore: boolean
  considerSkills: boolean
}

interface Settings2025Props {
  config: AssignmentConfig | null
  loading: boolean
  onConfigChange: (field: keyof AssignmentConfig, value: any) => void
  onSave: () => void
}

export function Settings2025({ config, loading, onConfigChange, onSave }: Settings2025Props) {
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-mint-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <SettingsIcon className="w-8 h-8 text-slate-600 animate-spin" />
          </div>
          <p className="text-slate-600 font-medium">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-mint-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <SettingsIcon className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">No configuration found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 pt-24 bg-gradient-to-br from-slate-50 via-white to-mint-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shadow-md">
              <SettingsIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-800">Settings</h1>
              <p className="text-slate-600">Configure lead assignment rules</p>
            </div>
          </div>

          <button
            onClick={onSave}
            className="px-6 py-2 bg-gradient-to-r from-mint-400 to-mint-500 text-white font-medium rounded-xl hover:from-mint-500 hover:to-mint-600 transition-all shadow-mint-md flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>

        {/* Assignment Strategy */}
        <div className="mb-6 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-6 shadow-soft">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Lead Assignment Strategy</h2>

          <div className="space-y-6">
            {/* Strategy Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Assignment Strategy
              </label>
              <select
                value={config.strategy}
                onChange={(e) => onConfigChange('strategy', e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mint-500 font-medium"
              >
                <option value="ROUND_ROBIN">Round Robin (Balanced Distribution)</option>
                <option value="LEAST_ACTIVE">Least Active (Lowest Workload First)</option>
                <option value="SKILLS_BASED">Skills Based (Coming Soon)</option>
                <option value="GEOGRAPHIC">Geographic (Coming Soon)</option>
                <option value="CUSTOM">Custom Rules (Coming Soon)</option>
              </select>
              <p className="text-xs text-slate-500 mt-2">
                Choose how leads are automatically assigned to salesmen
              </p>
            </div>

            {/* Auto-Assign Toggle */}
            <div className="flex items-start gap-4 p-4 bg-mint-50/50 border border-mint-200 rounded-xl">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoAssign}
                  onChange={(e) => onConfigChange('autoAssign', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-200 peer-focus:ring-2 peer-focus:ring-mint-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-mint-500"></div>
              </label>
              <div className="flex-1">
                <div className="font-semibold text-slate-800 mb-1">Enable Auto-Assignment</div>
                <p className="text-xs text-slate-600">
                  Automatically assign new leads based on the selected strategy
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Options */}
        <div className="mb-6 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-6 shadow-soft">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Strategy Options</h2>

          <div className="space-y-4">
            {/* Consider Capacity */}
            <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl hover:bg-slate-50/50 transition-colors">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.considerCapacity}
                  onChange={(e) => onConfigChange('considerCapacity', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-mint-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-mint-500"></div>
              </label>
              <div className="flex-1">
                <div className="font-semibold text-slate-800 mb-1">Consider Salesman Capacity</div>
                <p className="text-xs text-slate-600">
                  Do not assign to salesmen who have reached their capacity limit
                </p>
              </div>
            </div>

            {/* Consider Score */}
            <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl hover:bg-slate-50/50 transition-colors">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.considerScore}
                  onChange={(e) => onConfigChange('considerScore', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-mint-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-mint-500"></div>
              </label>
              <div className="flex-1">
                <div className="font-semibold text-slate-800 mb-1">Consider Salesman Score</div>
                <p className="text-xs text-slate-600">
                  Prioritize salesmen with higher performance scores
                </p>
              </div>
            </div>

            {/* Consider Skills (Disabled) */}
            <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50/30 opacity-60">
              <label className="relative inline-flex items-center cursor-not-allowed">
                <input
                  type="checkbox"
                  checked={config.considerSkills}
                  disabled
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-mint-500"></div>
              </label>
              <div className="flex-1">
                <div className="font-semibold text-slate-800 mb-1">
                  Consider Skills Matching
                  <span className="ml-2 px-2 py-0.5 bg-lemon-100 text-lemon-700 rounded text-xs font-semibold">Coming Soon</span>
                </div>
                <p className="text-xs text-slate-600">
                  Match leads with salesmen based on product/service expertise
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gradient-to-br from-mint-50 to-white border border-mint-200 rounded-2xl p-6 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-mint-600" />
            <h2 className="text-xl font-bold text-slate-800">How It Works</h2>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-6 h-6 rounded-full bg-mint-100 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-mint-600" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">Round Robin</h3>
                <p className="text-sm text-slate-600">
                  Distributes leads evenly among all active salesmen, considering capacity and optionally scores
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-6 h-6 rounded-full bg-mint-100 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-mint-600" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">Least Active</h3>
                <p className="text-sm text-slate-600">
                  Always assigns to the salesman with the fewest active leads
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                  <Info className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">
                  Skills Based
                  <span className="ml-2 px-2 py-0.5 bg-lemon-100 text-lemon-700 rounded text-xs font-semibold">Coming Soon</span>
                </h3>
                <p className="text-sm text-slate-600">
                  Match leads to salesmen based on product categories or expertise
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                  <Info className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">
                  Geographic
                  <span className="ml-2 px-2 py-0.5 bg-lemon-100 text-lemon-700 rounded text-xs font-semibold">Coming Soon</span>
                </h3>
                <p className="text-sm text-slate-600">
                  Assign based on lead location and salesman territories
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
