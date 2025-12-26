import { useEffect, useState } from 'react'
import { Inbox, Send, Sparkles } from 'lucide-react'
import { ingestMessage, listBots } from '../lib/api'

type Channel =
  | 'MANUAL'
  | 'WHATSAPP'
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'INDIAMART'
  | 'JUSTDIAL'
  | 'GEM'
  | 'PHONE'
  | 'EMAIL'
  | 'PERSONAL_VISIT'
  | 'OTHER'

type BotLite = { id: string; name: string }

function Pill({ kind, text }: { kind: 'ok' | 'warn' | 'muted'; text: string }) {
  const cls =
    kind === 'ok'
      ? 'bg-mint-50 text-mint-700 border-mint-200'
      : kind === 'warn'
        ? 'bg-lemon-50 text-slate-800 border-lemon-200'
        : 'bg-slate-50 text-slate-600 border-slate-200'
  return <span className={`px-2.5 py-1 rounded-xl text-xs font-medium border ${cls}`}>{text}</span>
}

export function Ingest2025({
  onError,
  onInfo
}: {
  onError: (m: string) => void
  onInfo: (m: string) => void
}) {
  const [bots, setBots] = useState<BotLite[]>([])
  const [botId, setBotId] = useState('')
  const [channel, setChannel] = useState<Channel>('WHATSAPP')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('+971500000009')
  const [message, setMessage] = useState('Hi, need price and delivery ASAP')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const out = await listBots()
        setBots((out.bots ?? []).map((b: any) => ({ id: b.id, name: b.name })))
      } catch {
        // ignore
      }
    })()
  }, [])

  async function handleSend() {
    try {
      setSending(true)
      const out = await ingestMessage({
        botId: botId || undefined,
        channel,
        fullName: fullName || undefined,
        phone: phone || undefined,
        customerMessage: message
      })
      onInfo(`Ingested. Lead: ${out.leadId}`)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900">Ingest</h1>
        <p className="text-slate-600 mt-1">Simulate an inbound channel message to create/update a lead and trigger triage.</p>
      </div>

      <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-soft-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-lemon-400 to-lemon-500 flex items-center justify-center">
            <Inbox className="w-5 h-5 text-slate-900" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 mr-2">Ingest Message</h2>
              <Pill kind={channel === 'WHATSAPP' ? 'ok' : channel === 'INDIAMART' ? 'warn' : 'muted'} text={`CHANNEL ${channel}`} />
              <Pill kind={botId ? 'ok' : 'muted'} text={botId ? 'BOT SELECTED' : 'NO BOT'} />
            </div>
            <p className="text-sm text-slate-600">Stores IN/OUT messages and triggers AI triage + draft reply.</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            value={botId}
            onChange={(e) => setBotId(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-mint-500"
          >
            <option value="">(no bot)</option>
            {bots.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as Channel)}
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-mint-500"
          >
            {(
              [
                'MANUAL',
                'WHATSAPP',
                'FACEBOOK',
                'INSTAGRAM',
                'INDIAMART',
                'JUSTDIAL',
                'GEM',
                'PHONE',
                'EMAIL',
                'PERSONAL_VISIT',
                'OTHER'
              ] as Channel[]
            ).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name (optional)"
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-mint-500"
          />

          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-mint-500"
          />
        </div>

        <div className="mt-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-mint-500"
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="px-6 py-3 bg-mint-500 text-white rounded-2xl shadow-mint-md hover:shadow-mint-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending…' : 'Send inbound message'}
          </button>
        </div>
      </div>
    </div>
  )
}
