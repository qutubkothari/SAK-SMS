import { useEffect, useState } from 'react'
import { Bot, RefreshCw, Save, Settings2, ToggleLeft, ToggleRight } from 'lucide-react'
import { createBot, listBots, updateBot } from '../lib/api'

type PricingMode = 'ROUTE' | 'STANDARD'

type BotRow = {
  id: string
  name: string
  department?: string | null
  productTag?: string | null
  pricingMode: PricingMode
  isActive: boolean
}

function Pill({ kind, text }: { kind: 'ok' | 'warn' | 'muted'; text: string }) {
  const cls =
    kind === 'ok'
      ? 'bg-mint-50 text-mint-700 border-mint-200'
      : kind === 'warn'
        ? 'bg-lemon-50 text-slate-800 border-lemon-200'
        : 'bg-slate-50 text-slate-600 border-slate-200'
  return <span className={`px-2.5 py-1 rounded-xl text-xs font-medium border ${cls}`}>{text}</span>
}

export function Bots2025({
  onError,
  onInfo
}: {
  onError: (m: string) => void
  onInfo: (m: string) => void
}) {
  const [loading, setLoading] = useState(true)
  const [bots, setBots] = useState<BotRow[]>([])

  const [name, setName] = useState('Sales Assistant')
  const [department, setDepartment] = useState('General')
  const [productTag, setProductTag] = useState('')
  const [pricingMode, setPricingMode] = useState<PricingMode>('ROUTE')

  async function refresh() {
    try {
      setLoading(true)
      const out = await listBots()
      setBots(
        (out.bots ?? []).map((b: any) => ({
          id: b.id,
          name: b.name,
          department: b.department ?? null,
          productTag: b.productTag ?? null,
          pricingMode: b.pricingMode,
          isActive: Boolean(b.isActive)
        }))
      )
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate() {
    try {
      await createBot({
        name,
        department: department || undefined,
        productTag: productTag || undefined,
        pricingMode
      })
      onInfo('Bot created')
      await refresh()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed')
    }
  }

  async function handleSave(bot: BotRow) {
    try {
      await updateBot(bot.id, {
        name: bot.name,
        department: bot.department === '' ? null : bot.department,
        productTag: bot.productTag === '' ? null : bot.productTag,
        pricingMode: bot.pricingMode,
        isActive: Boolean(bot.isActive)
      })
      onInfo('Bot saved')
      await refresh()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Bots</h1>
          <p className="text-slate-600 mt-1">Create and manage AI bot profiles used for triage and replies.</p>
        </div>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-white/70 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/90 transition-colors text-slate-700 font-medium flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-soft-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Create Bot</h2>
            <p className="text-sm text-slate-600">Add a new bot profile for your tenant.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bot name"
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-mint-500"
          />
          <input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Department"
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-mint-500"
          />
          <input
            value={productTag}
            onChange={(e) => setProductTag(e.target.value)}
            placeholder="Product tag (optional)"
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-mint-500"
          />
          <select
            value={pricingMode}
            onChange={(e) => setPricingMode(e.target.value as PricingMode)}
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-mint-500"
          >
            <option value="ROUTE">Pricing: Route</option>
            <option value="STANDARD">Pricing: Standard</option>
          </select>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-mint-500 text-white rounded-2xl shadow-mint-md hover:shadow-mint-lg transition-all font-medium"
          >
            Create
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Your Bots</h2>
          {loading ? <span className="text-sm text-slate-500">Loading…</span> : null}
        </div>

        {bots.length === 0 && !loading ? (
          <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 border border-white/20 text-slate-600">
            No bots yet.
          </div>
        ) : null}

        {bots.map((b) => (
          <div key={b.id} className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-soft-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Settings2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill kind={b.isActive ? 'ok' : 'muted'} text={b.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    <Pill kind={b.pricingMode === 'STANDARD' ? 'warn' : 'muted'} text={b.pricingMode} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Bot ID: {b.id}</p>
                </div>
              </div>

              <button
                onClick={() => handleSave(b)}
                className="px-5 py-2.5 bg-white/70 hover:bg-white rounded-2xl border border-white/20 text-slate-700 font-medium flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                value={b.name}
                onChange={(e) => setBots((prev) => prev.map((p) => (p.id === b.id ? { ...p, name: e.target.value } : p)))}
                className="px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-mint-500"
                placeholder="Name"
              />
              <input
                value={b.department ?? ''}
                onChange={(e) =>
                  setBots((prev) => prev.map((p) => (p.id === b.id ? { ...p, department: e.target.value } : p)))
                }
                className="px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-mint-500"
                placeholder="Department"
              />
              <input
                value={b.productTag ?? ''}
                onChange={(e) =>
                  setBots((prev) => prev.map((p) => (p.id === b.id ? { ...p, productTag: e.target.value } : p)))
                }
                className="px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-mint-500"
                placeholder="Product tag"
              />
              <select
                value={b.pricingMode}
                onChange={(e) =>
                  setBots((prev) => prev.map((p) => (p.id === b.id ? { ...p, pricingMode: e.target.value as PricingMode } : p)))
                }
                className="px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-mint-500"
              >
                <option value="ROUTE">ROUTE</option>
                <option value="STANDARD">STANDARD</option>
              </select>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() =>
                  setBots((prev) => prev.map((p) => (p.id === b.id ? { ...p, isActive: !p.isActive } : p)))
                }
                className="text-slate-700 font-medium flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/70 hover:bg-white border border-white/20"
              >
                {b.isActive ? <ToggleRight className="w-5 h-5 text-mint-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                {b.isActive ? 'Disable' : 'Enable'}
              </button>
              <span className="text-sm text-slate-500">Changes are saved when you click Save.</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
