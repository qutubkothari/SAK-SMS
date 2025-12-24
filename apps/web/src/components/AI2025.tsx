import { Brain, Key, RefreshCw, Save, Info } from 'lucide-react'

interface AiConfig {
  provider: 'MOCK' | 'OPENAI' | 'GEMINI'
  openaiModel: string
  hasOpenaiApiKey: boolean
  tenantId: string
}

interface AI2025Props {
  config: AiConfig | null
  provider: 'MOCK' | 'OPENAI' | 'GEMINI'
  openaiModel: string
  openaiApiKey: string
  keyTouched: boolean
  onProviderChange: (provider: 'MOCK' | 'OPENAI' | 'GEMINI') => void
  onModelChange: (model: string) => void
  onApiKeyChange: (key: string) => void
  onSave: () => void
  onRefresh: () => void
}

export function AI2025({
  config,
  provider,
  openaiModel,
  openaiApiKey,
  keyTouched: _keyTouched,
  onProviderChange,
  onModelChange,
  onApiKeyChange,
  onSave,
  onRefresh,
}: AI2025Props) {
  const getProviderColor = (p: string) => {
    switch (p) {
      case 'OPENAI':
        return 'bg-mint-100 text-mint-700 border-mint-200'
      case 'GEMINI':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200'
    }
  }

  return (
    <div className="min-h-screen p-8 pt-24 bg-gradient-to-br from-purple-50 via-white to-mint-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center shadow-md">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-800">AI Configuration</h1>
              <p className="text-slate-600">Configure AI provider and models</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2 font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={onSave}
              className="px-6 py-2 bg-gradient-to-r from-purple-400 to-purple-500 text-white font-medium rounded-xl hover:from-purple-500 hover:to-purple-600 transition-all shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>

        {/* Status Cards */}
        {config && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl p-4 shadow-soft">
              <div className="text-xs text-slate-600 mb-1">Provider</div>
              <div className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold uppercase border ${getProviderColor(config.provider)}`}>
                {config.provider}
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl p-4 shadow-soft">
              <div className="text-xs text-slate-600 mb-1">API Key Status</div>
              <div className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold uppercase border ${
                config.hasOpenaiApiKey ? 'bg-mint-100 text-mint-700 border-mint-200' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {config.hasOpenaiApiKey ? 'KEY STORED' : 'NO KEY'}
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl p-4 shadow-soft">
              <div className="text-xs text-slate-600 mb-1">Tenant ID</div>
              <div className="text-sm font-mono font-semibold text-slate-800">{config.tenantId}</div>
            </div>
          </div>
        )}

        {/* Configuration Form */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-6 shadow-soft mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Provider Settings</h2>

          <div className="space-y-6">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                AI Provider
              </label>
              <select
                value={provider}
                onChange={(e) => onProviderChange(e.target.value as any)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              >
                <option value="MOCK">MOCK (Testing)</option>
                <option value="OPENAI">OpenAI</option>
                <option value="GEMINI">Google Gemini</option>
              </select>
              <p className="text-xs text-slate-500 mt-2">
                Select the AI provider for processing messages
              </p>
            </div>

            {/* OpenAI Model */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                OpenAI Model
              </label>
              <input
                value={openaiModel}
                onChange={(e) => onModelChange(e.target.value)}
                placeholder="e.g., gpt-4o-mini, gpt-4o"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-slate-500 mt-2">
                Specify the OpenAI model to use (default: gpt-4o-mini)
              </p>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Key className="w-4 h-4" />
                OpenAI API Key
              </label>
              <input
                type="password"
                value={openaiApiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder={config?.hasOpenaiApiKey ? '(stored) Leave blank to keep existing key' : 'Enter your OpenAI API key'}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
              />
              <p className="text-xs text-slate-500 mt-2">
                Your API key is encrypted and stored securely. Leave blank to keep existing key.
              </p>
            </div>
          </div>
        </div>

        {/* Information Card */}
        <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-2xl p-6 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Info className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">How AI Configuration Works</h3>
              <div className="text-sm text-slate-600 space-y-2">
                <p>
                  <strong>MOCK:</strong> Used for testing. Returns simulated AI responses without making external API calls.
                </p>
                <p>
                  <strong>OpenAI:</strong> Uses OpenAI's GPT models for intelligent message processing, triage, and reply drafting.
                </p>
                <p>
                  <strong>Gemini:</strong> Uses Google's Gemini AI models (coming soon).
                </p>
                <p className="pt-2 border-t border-purple-200">
                  <strong>Affected endpoints:</strong> <code className="text-xs bg-purple-100 px-2 py-0.5 rounded">/ingest/message</code>, 
                  <code className="text-xs bg-purple-100 px-2 py-0.5 rounded ml-1">/ai/triage</code>, 
                  <code className="text-xs bg-purple-100 px-2 py-0.5 rounded ml-1">/ai/draft-reply</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
