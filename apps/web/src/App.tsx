import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  authMode,
  assignLead,
  assignTriageItem,
  bulkAssignLeads,
  bulkUpdateLeadStatus,
  closeTriageItem,
  createBot,
  createSuccessDefinition,
  devBootstrap,
  devSeed,
  exportLeadsCsv,
  getDashboardStats,
  getUnreadNotificationCount,
  getSuccessAnalytics,
  getAiConfig,
  getLead,
  getLeadNotes,
  addLeadNote,
  importLeadsCsv,
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
              <Link to="/">Dashboard</Link>
              <Link to="/leads">{t('leads')}</Link>
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
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="sak-card" style={{ 
        padding: '48px 40px', 
        maxWidth: 440, 
        width: '100%',
        boxShadow: 'var(--shadow-xl)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 700, 
            marginBottom: 8,
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
            display: 'inline-block'
          }}>
            SAK CRM
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
            Sign in to your account
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Tenant ID</span>
            <input
              value={tenantId}
              onChange={(e) => {
                setTenantId(e.target.value)
                saveTenantId(e.target.value)
              }}
              placeholder="Enter your tenant ID"
              style={{ fontSize: 15 }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Email</span>
            <input 
              type="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="your.email@company.com" 
              style={{ fontSize: 15 }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Password</span>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter your password" 
              style={{ fontSize: 15 }}
            />
          </label>
          <button
            className="primary"
            style={{ 
              marginTop: 8,
              padding: '14px 20px',
              fontSize: 15,
              fontWeight: 600
            }}
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
            Sign In
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

function DashboardPage({ onError }: { onError: (m: string) => void }) {
  const [stats, setStats] = useState<any | null>(null)

  async function refresh() {
    try {
      const data = await getDashboardStats()
      setStats(data)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to load dashboard')
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!stats) return <div style={{ padding: 12 }}>Loading dashboard...</div>

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <button onClick={refresh}>Refresh</button>
      </div>

      {/* Key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div className="sak-card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#3b82f6' }}>{stats.totalLeads}</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>Total Leads</div>
        </div>
        <div className="sak-card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>{stats.newLeads}</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>New Leads</div>
        </div>
        <div className="sak-card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#8b5cf6' }}>{stats.activeLeads}</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>Active Leads</div>
        </div>
        <div className="sak-card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#10b981' }}>{stats.convertedLeads}</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>Converted</div>
        </div>
        <div className="sak-card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#ef4444' }}>{stats.totalTriageOpen}</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>Open Triage</div>
        </div>
        <div className="sak-card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#6366f1' }}>{stats.totalSalesmen}</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>Salesmen</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
        {/* Leads by status */}
        <div className="sak-card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Leads by Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(stats.leadsByStatus ?? []).map((x: any) => (
              <div key={x.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14 }}>{x.status}</span>
                <Badge kind="muted" text={String(x.count)} />
              </div>
            ))}
          </div>
        </div>

        {/* Leads by heat */}
        <div className="sak-card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Leads by Heat</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(stats.leadsByHeat ?? []).map((x: any) => (
              <div key={x.heat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14 }}>{x.heat}</span>
                <Badge
                  kind={
                    x.heat === 'ON_FIRE' || x.heat === 'VERY_HOT'
                      ? 'danger'
                      : x.heat === 'HOT'
                      ? 'warn'
                      : x.heat === 'WARM'
                      ? 'ok'
                      : 'muted'
                  }
                  text={String(x.count)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Leads by channel */}
        <div className="sak-card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Leads by Channel</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(stats.leadsByChannel ?? []).map((x: any) => (
              <div key={x.channel} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14 }}>{x.channel}</span>
                <Badge kind="muted" text={String(x.count)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent success events */}
      {stats.recentSuccessEvents && stats.recentSuccessEvents.length > 0 && (
        <div className="sak-card" style={{ padding: 16, marginTop: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Recent Wins (Last 7 Days)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.recentSuccessEvents.map((ev: any) => (
              <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 6 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{ev.definition?.name ?? ev.type}</div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>{ev.lead?.fullName ?? ev.lead?.phone ?? 'Unknown lead'}</div>
                </div>
                <Badge kind="ok" text={`+${ev.definition?.weight ?? 0}`} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LeadsPage({ onError }: { onError: (m: string) => void }) {
  const { t } = useTranslation()
  const [leads, setLeads] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [heatFilter, setHeatFilter] = useState<string>('ALL')
  const [channelFilter, setChannelFilter] = useState<string>('ALL')
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())
  const [salesmen, setSalesmen] = useState<any[]>([])
  const [bulkAction, setBulkAction] = useState<'assign' | 'status' | null>(null)
  const [bulkSalesmanId, setBulkSalesmanId] = useState<string>('')
  const [bulkStatus, setBulkStatus] = useState<string>('CONTACTED')

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
    ;(async () => {
      try {
        const sm = await listSalesmen()
        setSalesmen(sm.salesmen)
      } catch {
        // ignore
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleSelection = (leadId: string) => {
    const newSet = new Set(selectedLeadIds)
    if (newSet.has(leadId)) {
      newSet.delete(leadId)
    } else {
      newSet.add(leadId)
    }
    setSelectedLeadIds(newSet)
  }

  const toggleSelectAll = () => {
    if (selectedLeadIds.size === filteredLeads.length) {
      setSelectedLeadIds(new Set())
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map((l) => l.id)))
    }
  }

  const handleBulkAssign = async () => {
    if (selectedLeadIds.size === 0) return
    try {
      const result = await bulkAssignLeads(Array.from(selectedLeadIds), bulkSalesmanId || null)
      onError(`Assigned ${result.count} leads`)
      setSelectedLeadIds(new Set())
      setBulkAction(null)
      await refresh()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleBulkStatus = async () => {
    if (selectedLeadIds.size === 0) return
    try {
      const result = await bulkUpdateLeadStatus(Array.from(selectedLeadIds), bulkStatus)
      onError(`Updated ${result.count} leads`)
      setSelectedLeadIds(new Set())
      setBulkAction(null)
      await refresh()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed')
    }
  }

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      // Search term filter (name, phone, email, id)
      const term = searchTerm.toLowerCase()
      const matchesSearch =
        !term ||
        (l.fullName?.toLowerCase().includes(term)) ||
        (l.phone?.toLowerCase().includes(term)) ||
        (l.email?.toLowerCase().includes(term)) ||
        l.id.toLowerCase().includes(term)

      // Status filter
      const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter

      // Heat filter
      const matchesHeat = heatFilter === 'ALL' || l.heat === heatFilter

      // Channel filter
      const matchesChannel = channelFilter === 'ALL' || l.channel === channelFilter

      return matchesSearch && matchesStatus && matchesHeat && matchesChannel
    })
  }, [leads, searchTerm, statusFilter, heatFilter, channelFilter])

  return (
    <div style={{ padding: 12 }}>
      <div className="sak-card" style={{ padding: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>{t('leads')}</h2>
          <button onClick={refresh}>{t('refresh')}</button>
          <button
            onClick={async () => {
              try {
                await exportLeadsCsv()
                onError('Export started')
              } catch (err) {
                onError(err instanceof Error ? err.message : 'Export failed')
              }
            }}
          >
            Export CSV
          </button>
          <button
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.csv'
              input.onchange = async (e: any) => {
                const file = e.target?.files?.[0]
                if (!file) return
                try {
                  const text = await file.text()
                  const result = await importLeadsCsv(text)
                  onError(`Imported: ${result.created} created, ${result.skipped} skipped`)
                  refresh()
                } catch (err) {
                  onError(err instanceof Error ? err.message : 'Import failed')
                }
              }
              input.click()
            }}
          >
            Import CSV
          </button>
          {selectedLeadIds.size > 0 && (
            <>
              <button onClick={() => setBulkAction('assign')}>Bulk Assign ({selectedLeadIds.size})</button>
              <button onClick={() => setBulkAction('status')}>Bulk Status ({selectedLeadIds.size})</button>
              <button onClick={() => setSelectedLeadIds(new Set())} style={{ opacity: 0.7 }}>Clear</button>
            </>
          )}
          <span style={{ marginLeft: 'auto', opacity: 0.7 }}>
            {filteredLeads.length} / {leads.length}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, phone, email, ID..."
            style={{ minWidth: 250, flex: 1 }}
          />

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            <option value="NEW">NEW</option>
            <option value="CONTACTED">CONTACTED</option>
            <option value="QUALIFIED">QUALIFIED</option>
            <option value="QUOTED">QUOTED</option>
            <option value="WON">WON</option>
            <option value="LOST">LOST</option>
            <option value="ON_HOLD">ON_HOLD</option>
          </select>

          <select value={heatFilter} onChange={(e) => setHeatFilter(e.target.value)}>
            <option value="ALL">All Heat</option>
            <option value="ON_FIRE">ON_FIRE</option>
            <option value="VERY_HOT">VERY_HOT</option>
            <option value="HOT">HOT</option>
            <option value="WARM">WARM</option>
            <option value="COLD">COLD</option>
          </select>

          <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
            <option value="ALL">All Channels</option>
            <option value="WHATSAPP">WHATSAPP</option>
            <option value="FACEBOOK">FACEBOOK</option>
            <option value="INSTAGRAM">INSTAGRAM</option>
            <option value="INDIAMART">INDIAMART</option>
            <option value="MANUAL">MANUAL</option>
            <option value="OTHER">OTHER</option>
          </select>

          {(searchTerm || statusFilter !== 'ALL' || heatFilter !== 'ALL' || channelFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('ALL')
                setHeatFilter('ALL')
                setChannelFilter('ALL')
              }}
              style={{ opacity: 0.7 }}
            >
              Clear
            </button>
          )}
        </div>

        {bulkAction === 'assign' && (
          <div style={{ marginTop: 12, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>Assign {selectedLeadIds.size} leads to:</span>
              <select value={bulkSalesmanId} onChange={(e) => setBulkSalesmanId(e.target.value)}>
                <option value="">{t('unassigned')}</option>
                {salesmen.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName}
                  </option>
                ))}
              </select>
              <button onClick={handleBulkAssign}>Apply</button>
              <button onClick={() => setBulkAction(null)} style={{ opacity: 0.7 }}>Cancel</button>
            </div>
          </div>
        )}

        {bulkAction === 'status' && (
          <div style={{ marginTop: 12, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>Update {selectedLeadIds.size} leads to:</span>
              <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                {['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'WON', 'LOST', 'ON_HOLD'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button onClick={handleBulkStatus}>Apply</button>
              <button onClick={() => setBulkAction(null)} style={{ opacity: 0.7 }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <table style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th align="left">
              <input
                type="checkbox"
                checked={selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0}
                onChange={toggleSelectAll}
              />
            </th>
            <th align="left">{t('lead')}</th>
            <th align="left">{t('channel')}</th>
            <th align="left">{t('status')}</th>
            <th align="left">{t('heat')}</th>
            <th align="left">{t('assignedTo')}</th>
          </tr>
        </thead>
        <tbody>
          {filteredLeads.map((l) => (
            <tr key={l.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedLeadIds.has(l.id)}
                  onChange={() => toggleSelection(l.id)}
                />
              </td>
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
              <td style={{ opacity: l.assignedToSalesmanId ? 1 : 0.5 }}>
                {l.assignedToSalesmanId ? l.assignedToSalesmanId.slice(0, 8) : t('unassigned')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filteredLeads.length === 0 ? (
        <div style={{ marginTop: 12, opacity: 0.8 }}>
          {leads.length === 0 ? 'No leads yet.' : 'No leads match the current filters.'}
        </div>
      ) : null}
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
  const [viewMode, setViewMode] = useState<'overview' | 'timeline' | 'notes'>('overview')
  const [notes, setNotes] = useState<any[]>([])
  const [newNoteContent, setNewNoteContent] = useState<string>('')
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

  async function refreshNotes() {
    try {
      const out = await getLeadNotes(leadId)
      setNotes(out.notes)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to load notes')
    }
  }

  useEffect(() => {
    refresh()
    refreshNotes()
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

  // Build timeline from messages, events, triage items, and success events
  const timeline = useMemo(() => {
    if (!lead) return []
    const items: Array<{ time: Date; type: string; data: any }> = []
    
    ;(lead.messages ?? []).forEach((m: any) => {
      items.push({ time: new Date(m.createdAt), type: 'message', data: m })
    })
    
    ;(lead.events ?? []).forEach((e: any) => {
      items.push({ time: new Date(e.createdAt), type: 'event', data: e })
    })
    
    ;(lead.triageItems ?? []).forEach((t: any) => {
      items.push({ time: new Date(t.createdAt), type: 'triage', data: t })
    })
    
    ;(lead.successEvents ?? []).forEach((s: any) => {
      items.push({ time: new Date(s.createdAt), type: 'success', data: s })
    })
    
    return items.sort((a, b) => b.time.getTime() - a.time.getTime())
  }, [lead])

  if (!lead) return <div style={{ padding: 12 }}>Loading…</div>

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{lead.fullName ?? lead.phone ?? lead.id}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setViewMode('overview')} style={{ fontWeight: viewMode === 'overview' ? 'bold' : 'normal' }}>
            Overview
          </button>
          <button onClick={() => setViewMode('timeline')} style={{ fontWeight: viewMode === 'timeline' ? 'bold' : 'normal' }}>
            Timeline
          </button>
          <button onClick={() => setViewMode('notes')} style={{ fontWeight: viewMode === 'notes' ? 'bold' : 'normal' }}>
            Notes ({notes.length})
          </button>
        </div>
      </div>

      {/* Lead info card */}
      <div className="sak-card" style={{ marginBottom: 12, padding: 12 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
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
          {lead.phone ? (
            <div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Phone</div>
              <div>{lead.phone}</div>
            </div>
          ) : null}
          {lead.email ? (
            <div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Email</div>
              <div>{lead.email}</div>
            </div>
          ) : null}
          <div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Language</div>
            <div>{lead.language}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Created</div>
            <div style={{ fontSize: 13 }}>{new Date(lead.createdAt).toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Updated</div>
            <div style={{ fontSize: 13 }}>{new Date(lead.updatedAt).toLocaleString()}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #e0e0e0' }}>
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
      </div>

      {viewMode === 'timeline' ? (
        <div>
          <h3 style={{ marginTop: 0 }}>Activity Timeline</h3>
          {timeline.length === 0 ? (
            <div style={{ opacity: 0.8 }}>No activity yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {timeline.map((item, idx) => (
                <div key={idx} className="sak-card" style={{ padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Badge
                      kind={
                        item.type === 'message'
                          ? item.data.direction === 'IN'
                            ? 'warn'
                            : 'ok'
                          : item.type === 'success'
                          ? 'ok'
                          : item.type === 'triage' && item.data.status === 'OPEN'
                          ? 'danger'
                          : 'muted'
                      }
                      text={item.type.toUpperCase()}
                    />
                    <span style={{ fontSize: 13, opacity: 0.7 }}>{item.time.toLocaleString()}</span>
                  </div>
                  {item.type === 'message' ? (
                    <div>
                      <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>
                        {item.data.direction} • {item.data.channel}
                      </div>
                      <div>{item.data.body}</div>
                    </div>
                  ) : item.type === 'event' ? (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.data.type}</div>
                      <pre style={{ fontSize: 11, opacity: 0.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(item.data.payload, null, 2)}
                      </pre>
                    </div>
                  ) : item.type === 'triage' ? (
                    <div>
                      <div>
                        <Badge
                          kind={item.data.status === 'OPEN' ? 'warn' : item.data.status === 'CLOSED' ? 'ok' : 'muted'}
                          text={item.data.status}
                        />{' '}
                        • {item.data.reason}
                      </div>
                      {item.data.suggestedSalesmanId ? (
                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                          Suggested: {item.data.suggestedSalesmanId}
                        </div>
                      ) : null}
                    </div>
                  ) : item.type === 'success' ? (
                    <div>
                      <div>
                        {item.data.type} • weight {item.data.weight}
                      </div>
                      {item.data.salesmanId ? (
                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Salesman: {item.data.salesmanId}</div>
                      ) : null}
                      {item.data.note ? <div style={{ marginTop: 4, opacity: 0.9 }}>{item.data.note}</div> : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : viewMode === 'notes' ? (
        <div>
          <h3 style={{ marginTop: 0 }}>Notes & Activity</h3>
          
          <div style={{ marginBottom: 20 }}>
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Add a note or comment..."
              rows={3}
              style={{ width: '100%', marginBottom: 8 }}
            />
            <button
              className="primary"
              onClick={async () => {
                if (!newNoteContent.trim()) return
                try {
                  await addLeadNote(leadId, newNoteContent)
                  setNewNoteContent('')
                  onInfo('Note added')
                  await refreshNotes()
                } catch (e) {
                  onError(e instanceof Error ? e.message : 'Failed to add note')
                }
              }}
              disabled={!newNoteContent.trim()}
            >
              Add Note
            </button>
          </div>

          {notes.length === 0 ? (
            <div style={{ opacity: 0.8 }}>No notes yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {notes.map((note) => (
                <div key={note.id} className="sak-card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{note.user.displayName}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{new Date(note.createdAt).toLocaleString()}</div>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{note.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Messages</h3>
            {(lead.messages ?? []).length === 0 ? (
              <div style={{ opacity: 0.8 }}>No messages yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(lead.messages ?? []).map((m: any) => (
                  <div key={m.id} className="sak-card" style={{ padding: 10 }}>
                    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                      <Badge kind={m.direction === 'IN' ? 'warn' : 'ok'} text={m.direction} /> • {m.channel} •{' '}
                      {new Date(m.createdAt).toLocaleString()}
                    </div>
                    <div>{m.body}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Events</h3>
            {(lead.events ?? []).length === 0 ? (
              <div style={{ opacity: 0.8 }}>No events yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(lead.events ?? []).map((e: any) => (
                  <div key={e.id} className="sak-card" style={{ padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Badge kind="muted" text={e.type} />
                      <span style={{ fontSize: 12, opacity: 0.7 }}>{new Date(e.createdAt).toLocaleString()}</span>
                    </div>
                    <details>
                      <summary style={{ cursor: 'pointer', fontSize: 13, opacity: 0.8 }}>Show details</summary>
                      <pre style={{ fontSize: 11, marginTop: 6, whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(e.payload, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Triage History</h3>
            {(lead.triageItems ?? []).length === 0 ? (
              <div style={{ opacity: 0.8 }}>No triage items.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(lead.triageItems ?? []).map((it: any) => (
                  <div key={it.id} className="sak-card" style={{ padding: 10 }}>
                    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{new Date(it.createdAt).toLocaleString()}</div>
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
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Success</h3>
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
        </>
      )}
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
                <DashboardPage onError={onError} />
              </RequireAuth>
            }
          />
          <Route
            path="/leads"
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
