import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  authMode,
  assignLead,
  assignTriageItem,
  closeTriageItem,
  createBot,
  createSuccessDefinition,
  devBootstrap,
  devSeed,
  getUnreadNotificationCount,
  getSuccessAnalytics,
  getAiConfig,
  getLead,
  ingestMessage,
  listNotifications,
  loadTenantId,
  listLeads,
  listBots,
  listSalesmen,
  listSuccessDefinitions,
  listTriage,
  login,
  loadDevAuth,
  logout,
  markAllNotificationsRead,
  markNotificationRead,
  me,
  recomputeScores,
  recordLeadSuccess,
  saveDevAuth,
  saveTenantId,
  reopenTriageItem,
  type Notification,
  type TriageStatusFilter,
  type SessionUser,
  updateAiConfig,
  updateBot,
  updateSalesman,
  updateSuccessDefinition,
  updateLeadStatus
} from './lib/api'

type SessionState = { loading: boolean; user: SessionUser | null }

type Toast = { kind: 'error' | 'info'; message: string }

function dotClass(kind: 'ok' | 'warn' | 'danger' | 'muted') {
  if (kind === 'ok') return 'sak-dot sak-dot--mint'
  if (kind === 'warn') return 'sak-dot sak-dot--sun'
  if (kind === 'danger') return 'sak-dot sak-dot--danger'
  return 'sak-dot'
}

function Badge({ kind, text }: { kind: 'ok' | 'warn' | 'danger' | 'muted'; text: string }) {
  return (
    <span className="sak-badge">
      <span className={dotClass(kind)} />
      {text}
    </span>
  )
}

function triageReasonKind(reason: string): 'ok' | 'warn' | 'danger' | 'muted' {
  const r = reason.toLowerCase()
  if (r.includes('pricing') || r.includes('price')) return 'danger'
  if (r.includes('uncertain') || r.includes('unknown') || r.includes('not sure')) return 'warn'
  if (r.includes('handoff') || r.includes('human')) return 'warn'
  return 'muted'
}

function scoreKind(score: number): 'ok' | 'warn' | 'danger' | 'muted' {
  if (!Number.isFinite(score)) return 'muted'
  if (score >= 70) return 'ok'
  if (score >= 40) return 'warn'
  return 'danger'
}

function weightKind(weight: number): 'ok' | 'warn' | 'danger' | 'muted' {
  if (!Number.isFinite(weight)) return 'muted'
  if (weight >= 60) return 'danger'
  if (weight >= 25) return 'warn'
  return 'muted'
}

function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])
  return { toast, setToast }
}

function TopBar({ session, onLoggedOut }: { session: SessionState; onLoggedOut: () => void }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [auth, setAuth] = useState(loadDevAuth())
  const isArabic = i18n.language === 'ar'
  const mode = authMode()

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [notifications, setNotifications] = useState<Notification[]>([])

  async function refreshUnreadCount() {
    try {
      const out = await getUnreadNotificationCount()
      setUnreadCount(out.count)
    } catch {
      setUnreadCount(0)
    }
  }

  async function refreshNotifications() {
    try {
      const out = await listNotifications({ limit: 20 })
      setNotifications(out.notifications)
    } catch {
      setNotifications([])
    }
  }

  useEffect(() => {
    if (mode === 'dev_headers' || session.user) {
      refreshUnreadCount().catch(() => undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, session.user?.id])

  useEffect(() => {
    if (!notificationsOpen) return
    refreshNotifications().catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsOpen])

  useEffect(() => {
    document.documentElement.lang = i18n.language
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr'
  }, [i18n.language, isArabic])

  return (
    <div className="sak-topbar">
      <div className="sak-topbar__inner">
        <div className="sak-topbar__nav">
          <strong className="sak-topbar__title">{t('appTitle')}</strong>
          {mode === 'dev_headers' || session.user ? (
            <>
              <Link to="/">{t('leads')}</Link>
              <Link to="/triage">{t('triage')}</Link>
              <Link to="/salesmen">Salesmen</Link>
              <Link to="/success">Success</Link>
              <Link to="/ai">AI</Link>
              <Link to="/bots">Bots</Link>
              <Link to="/ingest">Ingest</Link>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>

        <div className="sak-topbar__spacer" />

        <div className="sak-topbar__controls">
          <label className="sak-topbar__field">
            <span className="sak-topbar__label">{t('language')}</span>
            <select value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
              <option value="en">EN</option>
              <option value="ar">AR</option>
            </select>
          </label>

          {mode === 'dev_headers' || session.user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setNotificationsOpen((v) => !v)}
                style={{ padding: '10px 12px' }}
              >
                {t('notifications')}
                {unreadCount > 0 ? ` (${unreadCount})` : ''}
              </button>
              {notificationsOpen ? (
                <div
                  className="sak-card"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    width: 360,
                    maxWidth: '80vw',
                    padding: 10
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <strong style={{ flex: 1 }}>{t('notifications')}</strong>
                    <button
                      onClick={async () => {
                        await markAllNotificationsRead().catch(() => undefined)
                        await refreshNotifications().catch(() => undefined)
                        await refreshUnreadCount().catch(() => undefined)
                      }}
                    >
                      {t('markAllRead')}
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="muted" style={{ padding: 8 }}>
                      {t('noNotifications')}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {notifications.map((n) => {
                        const isUnread = !n.readAt
                        return (
                          <div
                            key={n.id}
                            className="sak-card"
                            style={{ padding: 10 }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 900 }}>
                                  {isUnread ? '• ' : ''}
                                  {n.title}
                                </div>
                                {n.body ? <div className="muted">{n.body}</div> : null}
                                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                                  {new Date(n.createdAt).toLocaleString()}
                                </div>
                              </div>
                              {isUnread ? (
                                <button
                                  onClick={async () => {
                                    await markNotificationRead(n.id).catch(() => undefined)
                                    await refreshNotifications().catch(() => undefined)
                                    await refreshUnreadCount().catch(() => undefined)
                                  }}
                                >
                                  {t('markRead')}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {mode === 'dev_headers' ? (
            <>
              <label className="sak-topbar__field">
                <span className="sak-topbar__label">{t('tenantId')}</span>
                <input value={auth.tenantId} onChange={(e) => setAuth({ ...auth, tenantId: e.target.value })} style={{ width: 220 }} />
              </label>
              <label className="sak-topbar__field">
                <span className="sak-topbar__label">{t('userId')}</span>
                <input value={auth.userId} onChange={(e) => setAuth({ ...auth, userId: e.target.value })} style={{ width: 220 }} />
              </label>
              <label className="sak-topbar__field">
                <span className="sak-topbar__label">{t('role')}</span>
                <select value={auth.role} onChange={(e) => setAuth({ ...auth, role: e.target.value as any })}>
                  <option value="MANAGER">MANAGER</option>
                  <option value="SALESMAN">SALESMAN</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="OWNER">OWNER</option>
                </select>
              </label>
              <button
                onClick={() => {
                  saveDevAuth(auth)
                  navigate(0)
                }}
              >
                {t('save')}
              </button>
            </>
          ) : session.user ? (
            <>
              <Badge kind={'muted'} text={`TENANT ${session.user.tenantId}`} />
              <Badge kind={'ok'} text={`${session.user.displayName} (${session.user.role})`} />
              <button
                onClick={async () => {
                  await logout().catch(() => undefined)
                  onLoggedOut()
                  navigate('/login')
                }}
              >
                Logout
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function LoginPage({ onError, onLoggedIn }: { onError: (m: string) => void; onLoggedIn: (u: SessionUser) => void }) {
  const navigate = useNavigate()
  const [tenantId, setTenantId] = useState(loadTenantId())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div style={{ padding: 12 }}>
      <div className="sak-card" style={{ padding: 12, maxWidth: 520 }}>
        <h2 style={{ marginTop: 0 }}>Login</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            Tenant ID
            <input
              value={tenantId}
              onChange={(e) => {
                setTenantId(e.target.value)
                saveTenantId(e.target.value)
              }}
              placeholder="tenantId"
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@company.com" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          </label>
          <button
            onClick={async () => {
              try {
                const out = await login({ tenantId, email, password })
                onLoggedIn(out.user)
                navigate('/')
              } catch (e) {
                onError(e instanceof Error ? e.message : 'Login failed')
              }
            }}
          >
            Login
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
          If you don’t know your Tenant ID, ask your admin.
        </div>
      </div>
    </div>
  )
}

function RequireAuth({ session, children }: { session: SessionState; children: ReactElement }) {
  if (authMode() === 'dev_headers') return children
  if (session.loading) return <div style={{ padding: 12 }}>Loading…</div>
  if (!session.user) return <Navigate to="/login" replace />
  return children
}

function AiPage({ onError, onInfo }: { onError: (m: string) => void; onInfo: (m: string) => void }) {
  const [config, setConfig] = useState<any | null>(null)
  const [provider, setProvider] = useState<'MOCK' | 'OPENAI' | 'GEMINI'>('MOCK')
  const [openaiModel, setOpenaiModel] = useState<string>('gpt-4o-mini')
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('')
  const [keyTouched, setKeyTouched] = useState(false)

  async function refresh() {
    try {
      const out = await getAiConfig()
      setConfig(out.config)
      setProvider(out.config.provider)
      setOpenaiModel(out.config.openaiModel ?? 'gpt-4o-mini')
      if (out.warning) onInfo(out.warning)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed')
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ padding: 12 }}>
      <div className="sak-card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>AI</h2>
          <Badge kind={provider === 'OPENAI' ? 'ok' : provider === 'GEMINI' ? 'warn' : 'muted'} text={`PROVIDER ${provider}`} />
          {config ? <Badge kind={config.hasOpenaiApiKey ? 'ok' : 'muted'} text={config.hasOpenaiApiKey ? 'OPENAI KEY STORED' : 'NO OPENAI KEY'} /> : null}
          {config ? <Badge kind={'muted'} text={`TENANT ${config.tenantId}`} /> : null}
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          Provider
          <select value={provider} onChange={(e) => setProvider(e.target.value as any)}>
            <option value="MOCK">MOCK</option>
            <option value="OPENAI">OPENAI</option>
            <option value="GEMINI">GEMINI</option>
          </select>
        </label>

        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          OpenAI model
          <input value={openaiModel} onChange={(e) => setOpenaiModel(e.target.value)} style={{ width: 220 }} />
        </label>

        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          OpenAI API key
          <input
            type="password"
            value={openaiApiKey}
            onChange={(e) => {
              setOpenaiApiKey(e.target.value)
              setKeyTouched(true)
            }}
            placeholder={config?.hasOpenaiApiKey ? '(stored) leave blank to keep' : ''}
            style={{ width: 320 }}
          />
        </label>

        <button
          onClick={async () => {
            try {
              const payload: any = {
                provider,
                openaiModel: openaiModel || null
              }
              if (keyTouched) payload.openaiApiKey = openaiApiKey ? openaiApiKey : null
              const out = await updateAiConfig(payload)
              if (out.warning) onInfo(out.warning)
              onInfo('Saved AI config')
              setOpenaiApiKey('')
              setKeyTouched(false)
              await refresh()
            } catch (err) {
              onError(err instanceof Error ? err.message : 'Failed')
            }
          }}
        >
          Save
        </button>
        <button onClick={refresh}>Refresh</button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
          This affects `/ingest/message`, `/ai/triage`, and `/ai/draft-reply` for this tenant.
        </div>
      </div>
    </div>
  )
}

function BotsPage({ onError, onInfo }: { onError: (m: string) => void; onInfo: (m: string) => void }) {
  const [bots, setBots] = useState<any[]>([])
  const [name, setName] = useState('Sales Assistant')
  const [department, setDepartment] = useState('General')
  const [productTag, setProductTag] = useState('')
  const [pricingMode, setPricingMode] = useState<'ROUTE' | 'STANDARD'>('ROUTE')

  async function refresh() {
    try {
      const out = await listBots()
      setBots(out.bots)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed')
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ padding: 12 }}>
      <h2 style={{ marginTop: 0 }}>Bots</h2>
      <div className="sak-card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bot name" />
          <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Department" />
          <input value={productTag} onChange={(e) => setProductTag(e.target.value)} placeholder="Product tag (optional)" />
          <select value={pricingMode} onChange={(e) => setPricingMode(e.target.value as any)}>
            <option value="ROUTE">Pricing: Route</option>
            <option value="STANDARD">Pricing: Standard</option>
          </select>
          <button
            onClick={async () => {
              try {
                await createBot({
                  name,
                  department: department || undefined,
                  productTag: productTag || undefined,
                  pricingMode
                })
                onInfo('Bot created')
                await refresh()
              } catch (err) {
                onError(err instanceof Error ? err.message : 'Failed')
              }
            }}
          >
            Create
          </button>
          <button onClick={refresh}>Refresh</button>
        </div>
      </div>

      <table style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">Department</th>
            <th align="left">Product</th>
            <th align="left">Pricing</th>
            <th align="left">Active</th>
            <th align="left">Indicators</th>
            <th align="left"></th>
          </tr>
        </thead>
        <tbody>
          {bots.map((b) => (
            <tr key={b.id}>
              <td style={{ minWidth: 220 }}>
                <input
                  value={b.name}
                  onChange={(e) => setBots((prev) => prev.map((p) => (p.id === b.id ? { ...p, name: e.target.value } : p)))}
                />
              </td>
              <td style={{ minWidth: 180 }}>
                <input
                  value={b.department ?? ''}
                  onChange={(e) =>
                    setBots((prev) => prev.map((p) => (p.id === b.id ? { ...p, department: e.target.value } : p)))
                  }
                  placeholder=""
                />
              </td>
              <td style={{ minWidth: 160 }}>
                <input
                  value={b.productTag ?? ''}
                  onChange={(e) =>
                    setBots((prev) => prev.map((p) => (p.id === b.id ? { ...p, productTag: e.target.value } : p)))
                  }
                  placeholder=""
                />
              </td>
              <td>
                <select
                  value={b.pricingMode}
                  onChange={(e) =>
                    setBots((prev) => prev.map((p) => (p.id === b.id ? { ...p, pricingMode: e.target.value } : p)))
                  }
                >
                  <option value="ROUTE">ROUTE</option>
                  <option value="STANDARD">STANDARD</option>
                </select>
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={Boolean(b.isActive)}
                  onChange={(e) =>
                    setBots((prev) => prev.map((p) => (p.id === b.id ? { ...p, isActive: e.target.checked } : p)))
                  }
                />
              </td>
              <td style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Badge kind={b.isActive ? 'ok' : 'muted'} text={b.isActive ? 'ACTIVE' : 'INACTIVE'} />
                <Badge kind={b.pricingMode === 'STANDARD' ? 'warn' : 'muted'} text={b.pricingMode} />
              </td>
              <td>
                <button
                  onClick={async () => {
                    try {
                      await updateBot(b.id, {
                        name: b.name,
                        department: b.department === '' ? null : b.department,
                        productTag: b.productTag === '' ? null : b.productTag,
                        pricingMode: b.pricingMode,
                        isActive: Boolean(b.isActive)
                      })
                      onInfo('Bot saved')
                      await refresh()
                    } catch (err) {
                      onError(err instanceof Error ? err.message : 'Failed')
                    }
                  }}
                >
                  Save
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {bots.length === 0 ? <div style={{ marginTop: 12, opacity: 0.8 }}>No bots yet.</div> : null}
    </div>
  )
}

function IngestPage({ onError, onInfo }: { onError: (m: string) => void; onInfo: (m: string) => void }) {
  const [bots, setBots] = useState<any[]>([])
  const [botId, setBotId] = useState<string>('')
  const [channel, setChannel] = useState('WHATSAPP')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('+971500000009')
  const [message, setMessage] = useState('Hi, need price and delivery ASAP')

  useEffect(() => {
    ;(async () => {
      try {
        const out = await listBots()
        setBots(out.bots)
      } catch {
        // ignore
      }
    })()
  }, [])

  return (
    <div style={{ padding: 12 }}>
      <div className="sak-card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Ingest (simulate channel message)</h2>
          <Badge kind={channel === 'WHATSAPP' ? 'ok' : channel === 'INDIAMART' ? 'warn' : 'muted'} text={`CHANNEL ${channel}`} />
          <Badge kind={botId ? 'ok' : 'muted'} text={botId ? 'BOT SELECTED' : 'NO BOT'} />
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={botId} onChange={(e) => setBotId(e.target.value)}>
            <option value="">(no bot)</option>
            {bots.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            {['WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'INDIAMART', 'MANUAL', 'OTHER'].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name (optional)" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" />
        </div>

        <div style={{ marginTop: 8 }}>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} style={{ width: '100%' }} />
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button
            onClick={async () => {
              try {
                const out = await ingestMessage({
                  botId: botId || undefined,
                  channel,
                  fullName: fullName || undefined,
                  phone: phone || undefined,
                  customerMessage: message
                })
                onInfo(`Ingested. Lead: ${out.leadId}`)
              } catch (err) {
                onError(err instanceof Error ? err.message : 'Failed')
              }
            }}
          >
            Send inbound message
          </button>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
          This stores IN/OUT messages in DB and triggers AI triage + draft reply. If pricing isn’t allowed, it escalates to triage.
        </div>
      </div>
    </div>
  )
}

function DevSetup({ onInfo, onError }: { onInfo: (m: string) => void; onError: (m: string) => void }) {
  const [tenantName, setTenantName] = useState('Demo Tenant')
  const [email, setEmail] = useState('manager@demo.local')
  const [password, setPassword] = useState('password123')
  const [displayName, setDisplayName] = useState('Manager')

  return (
    <div className="sak-card" style={{ padding: 12, marginBottom: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Dev setup</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="Tenant name" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Manager email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" />
        <button
          onClick={async () => {
            try {
              const out = await devBootstrap({ tenantName, email, password, displayName })
              const auth = loadDevAuth()
              auth.tenantId = out.tenant.id
              auth.userId = out.user.id
              auth.role = out.user.role
              saveDevAuth(auth)
              onInfo(`Bootstrapped tenant ${out.tenant.id}`)
            } catch (e) {
              onError(e instanceof Error ? e.message : 'Bootstrap failed')
            }
          }}
        >
          Bootstrap tenant
        </button>
        <button
          onClick={async () => {
            try {
              const auth = loadDevAuth()
              if (!auth.tenantId) throw new Error('Set tenantId first')
              await devSeed({ tenantId: auth.tenantId, salesmanCount: 5 })
              onInfo('Seeded salesmen + leads + triage')
            } catch (e) {
              onError(e instanceof Error ? e.message : 'Seed failed')
            }
          }}
        >
          Seed demo data
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
        Uses header-based dev auth. Password is not used by the web UI yet.
      </div>
    </div>
  )
}

function LeadsPage({ onError }: { onError: (m: string) => void }) {
  const { t } = useTranslation()
  const [leads, setLeads] = useState<any[]>([])

  async function refresh() {
    try {
      const out = await listLeads()
      setLeads(out.leads)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed')
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ padding: 12 }}>
      <div className="sak-card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0 }}>{t('leads')}</h2>
          <button onClick={refresh}>{t('refresh')}</button>
        </div>
      </div>
      <table style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th align="left">{t('lead')}</th>
            <th align="left">{t('channel')}</th>
            <th align="left">{t('status')}</th>
            <th align="left">{t('heat')}</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id}>
              <td>
                <Link to={`/leads/${l.id}`}>{l.fullName ?? l.phone ?? l.id}</Link>
              </td>
              <td>{l.channel}</td>
              <td>
                <Badge
                  kind={l.status === 'WON' ? 'ok' : l.status === 'LOST' ? 'danger' : l.status === 'NEW' ? 'warn' : 'muted'}
                  text={l.status}
                />
              </td>
              <td>
                <Badge
                  kind={l.heat === 'ON_FIRE' || l.heat === 'VERY_HOT' ? 'danger' : l.heat === 'HOT' ? 'warn' : 'muted'}
                  text={l.heat}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {leads.length === 0 ? <div style={{ marginTop: 12, opacity: 0.8 }}>No leads yet.</div> : null}
    </div>
  )
}

function LeadDetailPage({ onError, onInfo, role }: { onError: (m: string) => void; onInfo: (m: string) => void; role: string | null }) {
  const { t } = useTranslation()
  const params = useParams()
  const leadId = params.id ?? ''
  const [lead, setLead] = useState<any | null>(null)
  const [salesmen, setSalesmen] = useState<any[]>([])
  const [successDefs, setSuccessDefs] = useState<any[]>([])
  const [selectedSuccessDefId, setSelectedSuccessDefId] = useState<string>('')
  const [successNote, setSuccessNote] = useState<string>('')
  const canAssign = useMemo(() => {
    if (authMode() === 'dev_headers') return loadDevAuth().role !== 'SALESMAN'
    return role !== 'SALESMAN'
  }, [role])

  async function refresh() {
    try {
      const out = await getLead(leadId)
      setLead(out.lead)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed')
    }
  }

  useEffect(() => {
    refresh()
    ;(async () => {
      try {
        if (canAssign) {
          const [sm, defs] = await Promise.all([listSalesmen(), listSuccessDefinitions()])
          setSalesmen(sm.salesmen)
          setSuccessDefs(defs.definitions)
          if (!selectedSuccessDefId && defs.definitions.length > 0) {
            setSelectedSuccessDefId(defs.definitions[0].id)
          }
        }
      } catch {
        // ignore
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId])

  if (!lead) return <div style={{ padding: 12 }}>Loading…</div>

  return (
    <div style={{ padding: 12 }}>
      <h2 style={{ marginTop: 0 }}>{lead.fullName ?? lead.phone ?? lead.id}</h2>
      <div className="sak-card" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, padding: 12 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{t('channel')}</div>
          <div>{lead.channel}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{t('status')}</div>
          <div>
            <Badge
              kind={lead.status === 'WON' ? 'ok' : lead.status === 'LOST' ? 'danger' : lead.status === 'NEW' ? 'warn' : 'muted'}
              text={lead.status}
            />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{t('heat')}</div>
          <div>
            <Badge
              kind={lead.heat === 'ON_FIRE' || lead.heat === 'VERY_HOT' ? 'danger' : lead.heat === 'HOT' ? 'warn' : 'muted'}
              text={lead.heat}
            />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{t('assignedTo')}</div>
          <div>{lead.assignedToSalesmanId ?? t('unassigned')}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <label>
          {t('updateStatus')}:
          <select
            value={lead.status}
            onChange={async (e) => {
              try {
                await updateLeadStatus(lead.id, e.target.value)
                onInfo('Status updated')
                await refresh()
              } catch (err) {
                onError(err instanceof Error ? err.message : 'Failed')
              }
            }}
            style={{ marginLeft: 8 }}
          >
            {['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'WON', 'LOST', 'ON_HOLD'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {canAssign ? (
          <label>
            {t('assign')}:
            <select
              value={lead.assignedToSalesmanId ?? ''}
              onChange={async (e) => {
                try {
                  const value = e.target.value
                  await assignLead(lead.id, value === '' ? null : value)
                  onInfo('Assignment updated')
                  await refresh()
                } catch (err) {
                  onError(err instanceof Error ? err.message : 'Failed')
                }
              }}
              style={{ marginLeft: 8 }}
            >
              <option value="">{t('unassigned')}</option>
              {salesmen.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Messages</div>
        {(lead.messages ?? []).length === 0 ? (
          <div style={{ opacity: 0.8 }}>No messages yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(lead.messages ?? []).map((m: any) => (
              <div key={m.id} className="sak-card" style={{ padding: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {m.direction} • {m.channel} • {new Date(m.createdAt).toLocaleString()}
                </div>
                <div>{m.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Triage history</div>
        {(lead.triageItems ?? []).length === 0 ? (
          <div style={{ opacity: 0.8 }}>No triage items.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(lead.triageItems ?? []).map((it: any) => (
              <div key={it.id} className="sak-card" style={{ padding: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{new Date(it.createdAt).toLocaleString()}</div>
                <div>
                  <Badge kind={it.status === 'OPEN' ? 'warn' : it.status === 'CLOSED' ? 'ok' : 'muted'} text={it.status} />{' '}
                  • {it.reason}
                  {it.suggestedSalesmanId ? ` • suggested ${it.suggestedSalesmanId}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {canAssign ? (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Success</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={selectedSuccessDefId} onChange={(e) => setSelectedSuccessDefId(e.target.value)}>
              {successDefs.length === 0 ? <option value="">No success definitions</option> : null}
              {successDefs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.type}, weight {d.weight})
                </option>
              ))}
            </select>
            <input
              value={successNote}
              onChange={(e) => setSuccessNote(e.target.value)}
              placeholder="Note (optional)"
              style={{ minWidth: 260 }}
            />
            <button
              disabled={!selectedSuccessDefId}
              onClick={async () => {
                try {
                  await recordLeadSuccess(lead.id, { definitionId: selectedSuccessDefId, note: successNote || undefined })
                  onInfo('Success recorded')
                  setSuccessNote('')
                  await refresh()
                } catch (err) {
                  onError(err instanceof Error ? err.message : 'Failed')
                }
              }}
            >
              Record
            </button>
          </div>

          <div style={{ marginTop: 10 }}>
            {(lead.successEvents ?? []).length === 0 ? (
              <div style={{ opacity: 0.8 }}>No success events yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(lead.successEvents ?? []).map((ev: any) => (
                  <div key={ev.id} className="sak-card" style={{ borderRadius: 12, padding: 10 }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{new Date(ev.createdAt).toLocaleString()}</div>
                    <div>
                      {ev.type} • weight {ev.weight}
                      {ev.salesmanId ? ` • salesman ${ev.salesmanId}` : ''}
                    </div>
                    {ev.note ? <div style={{ marginTop: 4, opacity: 0.9 }}>{ev.note}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function TriagePage({ onError, onInfo }: { onError: (m: string) => void; onInfo: (m: string) => void }) {
  const { t } = useTranslation()
  const [items, setItems] = useState<any[]>([])
  const [salesmen, setSalesmen] = useState<any[]>([])
  const [status, setStatus] = useState<TriageStatusFilter>('OPEN')
  const [closeNoteById, setCloseNoteById] = useState<Record<string, string>>({})

  async function refresh() {
    try {
      const [triage, sm] = await Promise.all([listTriage(status), listSalesmen()])
      setItems(triage.items)
      setSalesmen(sm.salesmen)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed')
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  return (
    <div style={{ padding: 12 }}>
      <div className="sak-card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0 }}>{t('openTriage')}</h2>
          <button onClick={refresh}>{t('refresh')}</button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as TriageStatusFilter)}>
              <option value="OPEN">OPEN</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="CLOSED">CLOSED</option>
              <option value="ALL">ALL</option>
            </select>
          </div>
        </div>
      </div>
      <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">{t('lead')}</th>
            <th align="left">{t('reason')}</th>
            <th align="left">Status</th>
            <th align="left">{t('assign')}</th>
            <th align="left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td style={{ padding: '6px 0' }}>
                <Link to={`/leads/${it.lead.id}`}>{it.lead.fullName ?? it.lead.phone ?? it.lead.id}</Link>
              </td>
              <td>
                <Badge kind={triageReasonKind(it.reason)} text={it.reason} />
              </td>
              <td>
                <Badge
                  kind={it.status === 'OPEN' ? 'warn' : it.status === 'CLOSED' ? 'ok' : it.status === 'ASSIGNED' ? 'muted' : 'muted'}
                  text={it.status}
                />
              </td>
              <td>
                {it.status === 'CLOSED' ? (
                  <span style={{ fontSize: 12, opacity: 0.7 }}>—</span>
                ) : (
                  <select
                    defaultValue={it.suggestedSalesmanId ?? ''}
                    onChange={async (e) => {
                      try {
                        await assignTriageItem(it.id, e.target.value)
                        onInfo('Triage assigned')
                        await refresh()
                      } catch (err) {
                        onError(err instanceof Error ? err.message : 'Failed')
                      }
                    }}
                  >
                    <option value="" disabled>
                      Select…
                    </option>
                    {salesmen.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName}
                      </option>
                    ))}
                  </select>
                )}
              </td>
              <td>
                {it.status === 'CLOSED' ? (
                  <button
                    onClick={async () => {
                      try {
                        await reopenTriageItem(it.id)
                        onInfo('Reopened')
                        await refresh()
                      } catch (err) {
                        onError(err instanceof Error ? err.message : 'Failed')
                      }
                    }}
                  >
                    Reopen
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      value={closeNoteById[it.id] ?? ''}
                      onChange={(e) => setCloseNoteById((p) => ({ ...p, [it.id]: e.target.value }))}
                      placeholder="Close note (optional)"
                      style={{ width: 220 }}
                    />
                    <button
                      onClick={async () => {
                        try {
                          await closeTriageItem(it.id, { note: closeNoteById[it.id] || undefined })
                          setCloseNoteById((p) => {
                            const next = { ...p }
                            delete next[it.id]
                            return next
                          })
                          onInfo('Closed')
                          await refresh()
                        } catch (err) {
                          onError(err instanceof Error ? err.message : 'Failed')
                        }
                      }}
                    >
                      Close
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 ? <div style={{ marginTop: 12, opacity: 0.8 }}>No triage items.</div> : null}
    </div>
  )
}

function SalesmenPage({ onError, onInfo }: { onError: (m: string) => void; onInfo: (m: string) => void }) {
  const [rows, setRows] = useState<any[]>([])

  async function refresh() {
    try {
      const out = await listSalesmen()
      setRows(out.salesmen)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed')
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ padding: 12 }}>
      <div className="sak-card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0 }}>Salesmen</h2>
          <button onClick={refresh}>Refresh</button>
        </div>
      </div>

      <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">Email</th>
            <th align="left">Active leads</th>
            <th align="left">Score (0-100)</th>
            <th align="left">Capacity (0 = unlimited)</th>
            <th align="left">Active</th>
            <th align="left">Indicators</th>
            <th align="left"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <td style={{ padding: '6px 0' }}>{s.displayName}</td>
              <td>{s.email}</td>
              <td>{s.activeLeadCount ?? 0}</td>
              <td>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={String(s.score ?? 0)}
                  onChange={(e) =>
                    setRows((prev) => prev.map((p) => (p.id === s.id ? { ...p, score: Number(e.target.value) } : p)))
                  }
                  style={{ width: 120 }}
                />
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  max={200}
                  step={1}
                  value={String(s.capacity ?? 0)}
                  onChange={(e) =>
                    setRows((prev) => prev.map((p) => (p.id === s.id ? { ...p, capacity: Number(e.target.value) } : p)))
                  }
                  style={{ width: 160 }}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={Boolean(s.isActive)}
                  onChange={(e) =>
                    setRows((prev) => prev.map((p) => (p.id === s.id ? { ...p, isActive: e.target.checked } : p)))
                  }
                />
              </td>
              <td style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Badge kind={s.isActive ? 'ok' : 'muted'} text={s.isActive ? 'ACTIVE' : 'INACTIVE'} />
                <Badge kind={scoreKind(Number(s.score ?? 0))} text={`SCORE ${Number(s.score ?? 0)}`} />
                <Badge
                  kind={Number(s.capacity ?? 0) === 0 ? 'ok' : 'muted'}
                  text={Number(s.capacity ?? 0) === 0 ? 'CAP ∞' : `CAP ${Number(s.capacity ?? 0)}`}
                />
              </td>
              <td>
                <button
                  onClick={async () => {
                    try {
                      await updateSalesman(s.id, { score: Number(s.score), capacity: Number(s.capacity), isActive: Boolean(s.isActive) })
                      onInfo('Saved')
                      await refresh()
                    } catch (err) {
                      onError(err instanceof Error ? err.message : 'Failed')
                    }
                  }}
                >
                  Save
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 ? <div style={{ marginTop: 12, opacity: 0.8 }}>No salesmen yet.</div> : null}
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
        Routing uses score + current active-lead load and skips salesmen at/over capacity (when capacity &gt; 0).
      </div>
    </div>
  )
}

function SuccessPage({ onError, onInfo }: { onError: (m: string) => void; onInfo: (m: string) => void }) {
  const [defs, setDefs] = useState<any[]>([])
  const [name, setName] = useState('Demo booked')
  const [type, setType] = useState<'DEMO_BOOKED' | 'PAYMENT_RECEIVED' | 'ORDER_RECEIVED' | 'CONTRACT_SIGNED' | 'CUSTOM'>('DEMO_BOOKED')
  const [weight, setWeight] = useState(20)
  const [analytics, setAnalytics] = useState<any | null>(null)

  async function refresh() {
    try {
      const [out, a] = await Promise.all([listSuccessDefinitions(), getSuccessAnalytics(30)])
      setDefs(out.definitions)
      setAnalytics(a)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed')
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ padding: 12 }}>
      {analytics ? (
        <div className="sak-card" style={{ padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>Analytics</h2>
            <Badge kind={'muted'} text={`LAST ${analytics.days} DAYS`} />
          </div>

          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(analytics.eventsByType ?? []).map((x: any) => (
              <div key={x.type} className="sak-card" style={{ padding: 10, borderRadius: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{x.type}</div>
                <div style={{ fontWeight: 700 }}>{x.count}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>weight {x.weight}</div>
              </div>
            ))}
            {(analytics.eventsByType ?? []).length === 0 ? (
              <div style={{ opacity: 0.8 }}>No success events in this window.</div>
            ) : null}
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Leads by status</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {(analytics.leadStatusCounts ?? []).map((x: any) => (
                  <Badge key={x.status} kind={'muted'} text={`${x.status} ${x.count}`} />
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Leads by heat</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {(analytics.leadHeatCounts ?? []).map((x: any) => (
                  <Badge key={x.heat} kind={'muted'} text={`${x.heat} ${x.count}`} />
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Top salesmen (by success weight)</div>
            {(analytics.leaderboard ?? []).length === 0 ? (
              <div style={{ opacity: 0.8 }}>No salesman events yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th align="left">Salesman</th>
                    <th align="left">Events</th>
                    <th align="left">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics.leaderboard ?? []).map((r: any) => (
                    <tr key={r.salesmanId}>
                      <td style={{ padding: '6px 0' }}>{r.displayName}</td>
                      <td>{r.events}</td>
                      <td>
                        <Badge kind={weightKind(Number(r.weight ?? 0))} text={String(Number(r.weight ?? 0))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}

      <div className="sak-card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Success definitions</h2>
          <button onClick={refresh}>Refresh</button>
          <button
            onClick={async () => {
              try {
                const out = await recomputeScores()
                onInfo(`Scores recomputed (${out.updates.length})`)
              } catch (e) {
                onError(e instanceof Error ? e.message : 'Failed')
              }
            }}
          >
            Recompute salesman scores
          </button>
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <select value={type} onChange={(e) => setType(e.target.value as any)}>
            {['DEMO_BOOKED', 'PAYMENT_RECEIVED', 'ORDER_RECEIVED', 'CONTRACT_SIGNED', 'CUSTOM'].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            max={1000}
            step={1}
            value={String(weight)}
            onChange={(e) => setWeight(Number(e.target.value))}
            style={{ width: 140 }}
          />
          <button
            onClick={async () => {
              try {
                await createSuccessDefinition({ name, type, weight })
                onInfo('Created')
                await refresh()
              } catch (e) {
                onError(e instanceof Error ? e.message : 'Failed')
              }
            }}
          >
            Create
          </button>
        </div>
      </div>

      <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">Type</th>
            <th align="left">Weight</th>
            <th align="left">Active</th>
            <th align="left">Indicators</th>
            <th align="left"></th>
          </tr>
        </thead>
        <tbody>
          {defs.map((d) => (
            <tr key={d.id}>
              <td style={{ padding: '6px 0' }}>
                <input
                  value={d.name}
                  onChange={(e) => setDefs((prev) => prev.map((p) => (p.id === d.id ? { ...p, name: e.target.value } : p)))}
                  style={{ width: '100%' }}
                />
              </td>
              <td>{d.type}</td>
              <td>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  step={1}
                  value={String(d.weight)}
                  onChange={(e) =>
                    setDefs((prev) => prev.map((p) => (p.id === d.id ? { ...p, weight: Number(e.target.value) } : p)))
                  }
                  style={{ width: 140 }}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={Boolean(d.isActive)}
                  onChange={(e) =>
                    setDefs((prev) => prev.map((p) => (p.id === d.id ? { ...p, isActive: e.target.checked } : p)))
                  }
                />
              </td>
              <td style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Badge kind={d.isActive ? 'ok' : 'muted'} text={d.isActive ? 'ACTIVE' : 'INACTIVE'} />
                <Badge kind={d.type === 'DEMO_BOOKED' ? 'ok' : d.type === 'PAYMENT_RECEIVED' ? 'warn' : 'muted'} text={d.type} />
                <Badge kind={weightKind(Number(d.weight ?? 0))} text={`WEIGHT ${Number(d.weight ?? 0)}`} />
              </td>
              <td>
                <button
                  onClick={async () => {
                    try {
                      await updateSuccessDefinition(d.id, { name: d.name, weight: Number(d.weight), isActive: Boolean(d.isActive) })
                      onInfo('Saved')
                      await refresh()
                    } catch (e) {
                      onError(e instanceof Error ? e.message : 'Failed')
                    }
                  }}
                >
                  Save
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {defs.length === 0 ? <div style={{ marginTop: 12, opacity: 0.8 }}>No definitions yet.</div> : null}
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
        Each tenant can define what “success” means (with weights). Salesman scores are normalized to 0–100 based on success events in the last 30 days.
      </div>
    </div>
  )
}

function App() {
  const { toast, setToast } = useToast()
  const onError = (m: string) => setToast({ kind: 'error', message: m })
  const onInfo = (m: string) => setToast({ kind: 'info', message: m })

  const [session, setSession] = useState<SessionState>({ loading: authMode() !== 'dev_headers', user: null })

  useEffect(() => {
    if (authMode() === 'dev_headers') {
      setSession({ loading: false, user: null })
      return
    }
    let cancelled = false
    setSession((s) => ({ ...s, loading: true }))
    me()
      .then((out) => {
        if (!cancelled) setSession({ loading: false, user: out.user })
      })
      .catch(() => {
        if (!cancelled) setSession({ loading: false, user: null })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <TopBar
        session={session}
        onLoggedOut={() => {
          setSession({ loading: false, user: null })
        }}
      />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 12px 28px' }}>
        <div style={{ padding: 12 }}>
          {authMode() === 'dev_headers' ? <DevSetup onInfo={onInfo} onError={onError} /> : null}
          {toast ? (
            <div
              className="sak-card"
              style={{
                padding: 12,
                background: toast.kind === 'error' ? 'var(--danger-50)' : 'var(--mint-50)'
              }}
            >
              {toast.message}
            </div>
          ) : null}
        </div>
        <Routes>
          <Route
            path="/login"
            element={
              authMode() === 'dev_headers' ? (
                <Navigate to="/" replace />
              ) : (
                <LoginPage
                  onError={onError}
                  onLoggedIn={(u) => {
                    setSession({ loading: false, user: u })
                  }}
                />
              )
            }
          />

          <Route
            path="/"
            element={
              <RequireAuth session={session}>
                <LeadsPage onError={onError} />
              </RequireAuth>
            }
          />
          <Route
            path="/triage"
            element={
              <RequireAuth session={session}>
                <TriagePage onError={onError} onInfo={onInfo} />
              </RequireAuth>
            }
          />
          <Route
            path="/salesmen"
            element={
              <RequireAuth session={session}>
                <SalesmenPage onError={onError} onInfo={onInfo} />
              </RequireAuth>
            }
          />
          <Route
            path="/success"
            element={
              <RequireAuth session={session}>
                <SuccessPage onError={onError} onInfo={onInfo} />
              </RequireAuth>
            }
          />
          <Route
            path="/ai"
            element={
              <RequireAuth session={session}>
                <AiPage onError={onError} onInfo={onInfo} />
              </RequireAuth>
            }
          />
          <Route
            path="/leads/:id"
            element={
              <RequireAuth session={session}>
                <LeadDetailPage onError={onError} onInfo={onInfo} role={session.user?.role ?? null} />
              </RequireAuth>
            }
          />
          <Route
            path="/bots"
            element={
              <RequireAuth session={session}>
                <BotsPage onError={onError} onInfo={onInfo} />
              </RequireAuth>
            }
          />
          <Route
            path="/ingest"
            element={
              <RequireAuth session={session}>
                <IngestPage onError={onError} onInfo={onInfo} />
              </RequireAuth>
            }
          />
        </Routes>
      </div>
    </>
  )
}

export default App
