import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LoginPage } from './components/LoginPage'
import { Leads2025 } from './components/Leads2025'
import { Dashboard2025 } from './components/Dashboard2025'
import { AppLayout2025 } from './components/AppLayout2025'
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
  getActivityFeed,
  getAuditLogs,
  getUnreadNotificationCount,
  getSuccessAnalytics,
  getAiConfig,
  getLead,
  getLeadNotes,
  addLeadNote,
  getLeadCalls,
  logCall,
  getLeadTasks,
  createTask,
  updateTask,
  deleteTask,
  listMessageTemplates,
  sendLeadMessage,
  importLeadsCsv,
  ingestMessage,
  listNotifications,
  listLeads,
  listBots,
  listSalesmen,
  listSuccessDefinitions,
  listTriage,
  loadDevAuth,
  logout,
  markAllNotificationsRead,
  markNotificationRead,
  me,
  recomputeScores,
  recordLeadSuccess,
  saveDevAuth,
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

// Old AppLayout - kept for reference but no longer used (using AppLayout2025 now)
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AppLayout({ session, onLoggedOut, children }: { session: SessionState; onLoggedOut: () => void; children: React.ReactNode }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [auth, setAuth] = useState(() => loadDevAuth())
  const mode = authMode()
  const isArabic = i18n.language === 'ar'

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

  const navItems = [
    { to: '/', label: 'Dashboard', icon: 'ðŸ“Š' },
    { to: '/leads', label: t('leads'), icon: 'ðŸ‘¥' },
    { to: '/triage', label: t('triage'), icon: 'ðŸŽ¯' },
    { to: '/salesmen', label: 'Salesmen', icon: 'ðŸ‘”' },
    { to: '/reports', label: 'Reports', icon: 'ðŸ“ˆ' },
    { to: '/activity-feed', label: 'Activity', icon: 'âš¡' },
    ...(session.user?.role === 'ADMIN' ? [{ to: '/audit-logs', label: 'Audit', icon: 'ðŸ”' }] : []),
    { to: '/success', label: 'Success', icon: 'ðŸŽ‰' },
    { to: '/settings', label: 'Settings', icon: 'âš™ï¸' },
    { to: '/ai', label: 'AI', icon: 'ðŸ¤–' },
    { to: '/bots', label: 'Bots', icon: 'ðŸ”§' },
    { to: '/ingest', label: 'Ingest', icon: 'ðŸ“¥' },
  ]

  if (mode !== 'dev_headers' && !session.user) {
    return (
      <div className="sak-layout-simple">
        {children}
      </div>
    )
  }

  return (
    <div className="sak-layout">
      {/* Sidebar */}
      <aside className={`sak-sidebar ${sidebarCollapsed ? 'sak-sidebar--collapsed' : ''}`}>
        <div className="sak-sidebar__header">
          <div className="sak-sidebar__logo">
            <span className="sak-sidebar__logo-icon">ðŸŽ¯</span>
            {!sidebarCollapsed && <span className="sak-sidebar__logo-text">{t('appTitle')}</span>}
          </div>
          <button 
            className="sak-sidebar__toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand' : 'Collapse'}
          >
            {sidebarCollapsed ? 'â†’' : 'â†'}
          </button>
        </div>

        <nav className="sak-sidebar__nav">
          {navItems.map(item => (
            <Link 
              key={item.to}
              to={item.to} 
              className="sak-sidebar__link"
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="sak-sidebar__link-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="sak-sidebar__link-text">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {mode === 'dev_headers' && !sidebarCollapsed && (
          <div className="sak-sidebar__dev">
            <div className="sak-sidebar__dev-title">Dev Mode</div>
            <label className="sak-sidebar__dev-field">
              <span>Tenant ID</span>
              <input value={auth.tenantId} onChange={(e) => setAuth({ ...auth, tenantId: e.target.value })} />
            </label>
            <label className="sak-sidebar__dev-field">
              <span>User ID</span>
              <input value={auth.userId} onChange={(e) => setAuth({ ...auth, userId: e.target.value })} />
            </label>
            <label className="sak-sidebar__dev-field">
              <span>Role</span>
              <select value={auth.role} onChange={(e) => setAuth({ ...auth, role: e.target.value as any })}>
                <option value="MANAGER">MANAGER</option>
                <option value="SALESMAN">SALESMAN</option>
                <option value="ADMIN">ADMIN</option>
                <option value="OWNER">OWNER</option>
              </select>
            </label>
            <button
              className="sak-sidebar__dev-save"
              onClick={() => {
                saveDevAuth(auth)
                navigate(0)
              }}
            >
              {t('save')}
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="sak-main">
        {/* Top Header */}
        <header className="sak-header">
          <div className="sak-header__spacer" />
          
          <div className="sak-header__actions">
            {/* Language Selector */}
            <select 
              className="sak-header__select"
              value={i18n.language} 
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            >
              <option value="en">ðŸŒ EN</option>
              <option value="ar">ðŸŒ AR</option>
            </select>

            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button
                className="sak-header__btn"
                onClick={() => setNotificationsOpen((v) => !v)}
              >
                <span style={{ fontSize: '18px' }}>ðŸ””</span>
                {unreadCount > 0 && (
                  <span className="sak-header__badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <>
                  <div
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 9998
                    }}
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <div
                    className="sak-card sak-dropdown"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 8px)',
                      width: 400,
                      maxWidth: '90vw',
                      maxHeight: '70vh',
                      padding: 0,
                      zIndex: 9999,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 16px',
                        borderBottom: '2px solid #e5e7eb',
                        backgroundColor: '#f9fafb'
                      }}
                    >
                      <strong style={{ flex: 1, fontSize: '16px' }}>
                        {t('notifications')} {unreadCount > 0 && `(${unreadCount})`}
                      </strong>
                      {notifications.length > 0 && (
                        <button
                          onClick={async () => {
                            await markAllNotificationsRead().catch(() => undefined)
                            await refreshNotifications().catch(() => undefined)
                            await refreshUnreadCount().catch(() => undefined)
                          }}
                          style={{
                            padding: '6px 12px',
                            fontSize: '13px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          {t('markAllRead')}
                        </button>
                      )}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '500px' }}>
                      {notifications.length === 0 ? (
                        <div
                          style={{
                            padding: '40px 16px',
                            textAlign: 'center',
                            opacity: 0.6
                          }}
                        >
                          <div style={{ fontSize: '48px', marginBottom: '12px' }}>ðŸ”•</div>
                          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                            {t('noNotifications')}
                          </div>
                          <div style={{ fontSize: '14px' }}>You're all caught up!</div>
                        </div>
                      ) : (
                        <div>
                          {notifications.map((n, idx) => {
                            const isUnread = !n.readAt
                            const getNotificationIcon = (title: string) => {
                              const t = title.toLowerCase()
                              if (t.includes('lead')) return 'ðŸ‘¤'
                              if (t.includes('task')) return 'âœ“'
                              if (t.includes('call')) return 'ðŸ“ž'
                              if (t.includes('message')) return 'ðŸ’¬'
                              if (t.includes('success') || t.includes('won')) return 'ðŸŽ‰'
                              if (t.includes('urgent') || t.includes('hot')) return 'ðŸ”¥'
                              return 'ðŸ“¢'
                            }
                            return (
                              <div
                                key={n.id}
                                style={{
                                  padding: '12px 16px',
                                  borderBottom: idx < notifications.length - 1 ? '1px solid #e5e7eb' : 'none',
                                  backgroundColor: isUnread ? '#eff6ff' : 'white',
                                  transition: 'background-color 0.2s',
                                  cursor: 'pointer',
                                  position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isUnread) e.currentTarget.style.backgroundColor = '#f9fafb'
                                }}
                                onMouseLeave={(e) => {
                                  if (!isUnread) e.currentTarget.style.backgroundColor = 'white'
                                }}
                              >
                                {isUnread && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: '8px',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      width: '8px',
                                      height: '8px',
                                      borderRadius: '50%',
                                      backgroundColor: '#3b82f6'
                                    }}
                                  />
                                )}
                                <div style={{ display: 'flex', alignItems: 'start', gap: 12, marginLeft: isUnread ? '12px' : '0' }}>
                                  <div
                                    style={{
                                      fontSize: '24px',
                                      lineHeight: 1,
                                      marginTop: '2px'
                                    }}
                                  >
                                    {getNotificationIcon(n.title)}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                      style={{
                                        fontWeight: isUnread ? '700' : '600',
                                        marginBottom: '4px',
                                        color: '#111827'
                                      }}
                                    >
                                      {n.title}
                                    </div>
                                    {n.body && (
                                      <div
                                        style={{
                                          fontSize: '14px',
                                          color: '#6b7280',
                                          marginBottom: '6px',
                                          lineHeight: '1.4'
                                        }}
                                      >
                                        {n.body}
                                      </div>
                                    )}
                                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                      {(() => {
                                        const date = new Date(n.createdAt)
                                        const now = new Date()
                                        const diff = now.getTime() - date.getTime()
                                        const minutes = Math.floor(diff / 60000)
                                        const hours = Math.floor(minutes / 60)
                                        const days = Math.floor(hours / 24)
                                        
                                        if (minutes < 1) return 'Just now'
                                        if (minutes < 60) return `${minutes}m ago`
                                        if (hours < 24) return `${hours}h ago`
                                        if (days < 7) return `${days}d ago`
                                        return date.toLocaleDateString()
                                      })()}
                                    </div>
                                  </div>
                                  {isUnread && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        await markNotificationRead(n.id).catch(() => undefined)
                                        await refreshNotifications().catch(() => undefined)
                                        await refreshUnreadCount().catch(() => undefined)
                                      }}
                                      style={{
                                        padding: '4px 8px',
                                        fontSize: '12px',
                                        backgroundColor: 'white',
                                        color: '#3b82f6',
                                        border: '1px solid #3b82f6',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        flexShrink: 0
                                      }}
                                    >
                                      âœ“
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Menu */}
            <div style={{ position: 'relative' }}>
              <button
                className="sak-header__user"
                onClick={() => setUserMenuOpen((v) => !v)}
              >
                <span className="sak-header__user-avatar">
                  {session.user?.displayName?.[0]?.toUpperCase() || 'U'}
                </span>
                <span className="sak-header__user-name">
                  {session.user?.displayName || 'User'}
                </span>
              </button>
              {userMenuOpen && (
                <>
                  <div
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 9998
                    }}
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div
                    className="sak-card sak-dropdown"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 8px)',
                      width: 240,
                      padding: '8px',
                      zIndex: 9999
                    }}
                  >
                    <div style={{ 
                      padding: '12px', 
                      borderBottom: '1px solid #e5e7eb',
                      marginBottom: '8px'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {session.user?.displayName}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {session.user?.role}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        await logout().catch(() => undefined)
                        onLoggedOut()
                        setUserMenuOpen(false)
                        navigate('/login')
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        textAlign: 'left',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#ef4444',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <span>ðŸšª</span>
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="sak-content">
          {children}
        </main>
      </div>
    </div>
  )
}

function RequireAuth({ session, children }: { session: SessionState; children: ReactElement }) {
  if (authMode() === 'dev_headers') return children
  if (session.loading) return <div style={{ padding: 12 }}>Loadingâ€¦</div>
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
          This stores IN/OUT messages in DB and triggers AI triage + draft reply. If pricing isnâ€™t allowed, it escalates to triage.
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
  return <Dashboard2025 onError={onError} />
}

function LeadsPage({ onError }: { onError: (m: string) => void }) {
  const [leads, setLeads] = useState<any[]>([])

  async function refresh() {
    try {
      const out = await listLeads()
      setLeads(out.leads)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const handleExport = async () => {
    try {
      await exportLeadsCsv()
      onError('Export started')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Export failed')
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <Leads2025 leads={leads} onRefresh={refresh} onExport={handleExport} />
}

// Keep old implementation for reference (DEPRECATED - remove after testing)
// @ts-ignore
function LeadsPageOld({ onError }: { onError: (m: string) => void }) {
  const { t } = useTranslation()
  const [leads, setLeads] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [heatFilter, setHeatFilter] = useState<string>('ALL')
  const [channelFilter, setChannelFilter] = useState<string>('ALL')
  const [qualificationFilter, setQualificationFilter] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
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
    let filtered = leads.filter((l) => {
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

      // Qualification filter
      const matchesQualification = qualificationFilter === 'ALL' || l.qualificationLevel === qualificationFilter

      return matchesSearch && matchesStatus && matchesHeat && matchesChannel && matchesQualification
    })

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any
      
      switch (sortBy) {
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime()
          bVal = new Date(b.createdAt).getTime()
          break
        case 'score':
          aVal = a.score || 0
          bVal = b.score || 0
          break
        case 'name':
          aVal = (a.fullName || a.phone || '').toLowerCase()
          bVal = (b.fullName || b.phone || '').toLowerCase()
          break
        case 'lastActivity':
          aVal = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0
          bVal = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0
          break
        default:
          return 0
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
      }
    })

    return filtered
  }, [leads, searchTerm, statusFilter, heatFilter, channelFilter, qualificationFilter, sortBy, sortOrder])

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

          <select value={qualificationFilter} onChange={(e) => setQualificationFilter(e.target.value)}>
            <option value="ALL">All Qualification</option>
            <option value="HOT">ðŸ”¥ HOT</option>
            <option value="WARM">ðŸŒ¡ï¸ WARM</option>
            <option value="QUALIFIED">âœ“ QUALIFIED</option>
            <option value="COLD">â„ï¸ COLD</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="createdAt">Sort: Created Date</option>
            <option value="score">Sort: Score</option>
            <option value="name">Sort: Name</option>
            <option value="lastActivity">Sort: Last Activity</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            style={{ padding: '0.5rem', minWidth: '40px' }}
            title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
          >
            {sortOrder === 'asc' ? 'â†‘' : 'â†“'}
          </button>

          {(searchTerm || statusFilter !== 'ALL' || heatFilter !== 'ALL' || channelFilter !== 'ALL' || qualificationFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('ALL')
                setHeatFilter('ALL')
                setChannelFilter('ALL')
                setQualificationFilter('ALL')
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
            <th align="left">Score</th>
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
              <td>
                {l.score !== undefined && l.score !== null ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{l.score}</span>
                    {l.qualificationLevel && (
                      <Badge
                        kind={
                          l.qualificationLevel === 'HOT' ? 'danger' :
                          l.qualificationLevel === 'WARM' ? 'warn' :
                          l.qualificationLevel === 'QUALIFIED' ? 'ok' : 'muted'
                        }
                        text={l.qualificationLevel}
                      />
                    )}
                  </div>
                ) : (
                  <span style={{ opacity: 0.5 }}>â€”</span>
                )}
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
  const [viewMode, setViewMode] = useState<'overview' | 'timeline' | 'notes' | 'tasks'>('overview')
  const [notes, setNotes] = useState<any[]>([])
  const [newNoteContent, setNewNoteContent] = useState<string>('')
  const [showMessageModal, setShowMessageModal] = useState<boolean>(false)
  const [messageChannel, setMessageChannel] = useState<string>('WHATSAPP')
  const [messageContent, setMessageContent] = useState<string>('')
  const [templates, setTemplates] = useState<any[]>([])
  const [showCallModal, setShowCallModal] = useState<boolean>(false)
  const [callDirection, setCallDirection] = useState<string>('OUTBOUND')
  const [callOutcome, setCallOutcome] = useState<string>('ANSWERED')
  const [callDuration, setCallDuration] = useState<string>('')
  const [callNotes, setCallNotes] = useState<string>('')
  const [callRecordingUrl, setCallRecordingUrl] = useState<string>('')
  const [calls, setCalls] = useState<any[]>([])
  const [showTaskModal, setShowTaskModal] = useState<boolean>(false)
  const [taskTitle, setTaskTitle] = useState<string>('')
  const [taskDescription, setTaskDescription] = useState<string>('')
  const [taskDueDate, setTaskDueDate] = useState<string>('')
  const [taskPriority, setTaskPriority] = useState<string>('MEDIUM')
  const [tasks, setTasks] = useState<any[]>([])
  const [editingTask, setEditingTask] = useState<any | null>(null)
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

  async function refreshCalls() {
    try {
      const out = await getLeadCalls(leadId)
      setCalls(out.calls)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to load calls')
    }
  }

  async function refreshTasks() {
    try {
      const out = await getLeadTasks(leadId)
      setTasks(out.tasks)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to load tasks')
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
    refreshCalls()
    refreshTasks()
    ;(async () => {
      try {
        if (canAssign) {
          const [sm, defs, tmpl] = await Promise.all([listSalesmen(), listSuccessDefinitions(), listMessageTemplates()])
          setSalesmen(sm.salesmen)
          setSuccessDefs(defs.definitions)
          setTemplates(tmpl.templates)
          if (!selectedSuccessDefId && defs.definitions.length > 0) {
            setSelectedSuccessDefId(defs.definitions[0].id)
          }
        } else {
          const tmpl = await listMessageTemplates()
          setTemplates(tmpl.templates)
        }
      } catch {
        // ignore
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId])

  // Build timeline from messages, events, triage items, success events, and calls
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
    
    calls.forEach((c: any) => {
      items.push({ time: new Date(c.createdAt), type: 'call', data: c })
    })
    
    return items.sort((a, b) => b.time.getTime() - a.time.getTime())
  }, [lead, calls])

  if (!lead) return <div style={{ padding: 12 }}>Loadingâ€¦</div>

  return (
    <>
      {/* Message Modal */}
      {showMessageModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="sak-card" style={{
            maxWidth: 600,
            width: '90%',
            padding: 24,
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Send Message</h3>
              <button onClick={() => setShowMessageModal(false)}>âœ•</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Channel</label>
              <select value={messageChannel} onChange={(e) => setMessageChannel(e.target.value)}>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="MANUAL">Manual/Other</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="INSTAGRAM">Instagram</option>
              </select>
            </div>

            {templates.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Use Template</label>
                <select onChange={(e) => {
                  const tmpl = templates.find(t => t.id === e.target.value)
                  if (tmpl) setMessageContent(tmpl.content)
                }}>
                  <option value="">-- Select Template --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Message</label>
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={6}
                style={{ width: '100%' }}
                placeholder="Type your message..."
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowMessageModal(false)}>Cancel</button>
              <button
                className="primary"
                onClick={async () => {
                  if (!messageContent.trim()) return
                  try {
                    await sendLeadMessage(leadId, messageChannel, messageContent)
                    setMessageContent('')
                    setShowMessageModal(false)
                    onInfo('Message sent')
                    await refresh()
                  } catch (e) {
                    onError(e instanceof Error ? e.message : 'Failed to send message')
                  }
                }}
                disabled={!messageContent.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Modal */}
      {showCallModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="sak-card" style={{
            maxWidth: 600,
            width: '90%',
            padding: 24,
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Log Call</h3>
              <button onClick={() => setShowCallModal(false)}>âœ•</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Direction</label>
              <select value={callDirection} onChange={(e) => setCallDirection(e.target.value)}>
                <option value="OUTBOUND">Outbound (You called them)</option>
                <option value="INBOUND">Inbound (They called you)</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Outcome</label>
              <select value={callOutcome} onChange={(e) => setCallOutcome(e.target.value)}>
                <option value="ANSWERED">Answered</option>
                <option value="NO_ANSWER">No Answer</option>
                <option value="BUSY">Busy</option>
                <option value="VOICEMAIL">Voicemail</option>
                <option value="DISCONNECTED">Disconnected</option>
                <option value="WRONG_NUMBER">Wrong Number</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Duration (seconds)</label>
              <input
                type="number"
                value={callDuration}
                onChange={(e) => setCallDuration(e.target.value)}
                placeholder="Optional"
                min="0"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Notes</label>
              <textarea
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                rows={4}
                style={{ width: '100%' }}
                placeholder="Optional call notes..."
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Recording URL</label>
              <input
                type="url"
                value={callRecordingUrl}
                onChange={(e) => setCallRecordingUrl(e.target.value)}
                placeholder="Optional recording URL"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCallModal(false)}>Cancel</button>
              <button
                className="primary"
                onClick={async () => {
                  try {
                    await logCall(leadId, {
                      direction: callDirection as any,
                      outcome: callOutcome as any,
                      duration: callDuration ? parseInt(callDuration) : undefined,
                      notes: callNotes || undefined,
                      recordingUrl: callRecordingUrl || undefined
                    })
                    setCallDirection('OUTBOUND')
                    setCallOutcome('ANSWERED')
                    setCallDuration('')
                    setCallNotes('')
                    setCallRecordingUrl('')
                    setShowCallModal(false)
                    onInfo('Call logged')
                    await refreshCalls()
                  } catch (e) {
                    onError(e instanceof Error ? e.message : 'Failed to log call')
                  }
                }}
              >
                Save Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="sak-card" style={{
            maxWidth: 600,
            width: '90%',
            padding: 24,
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{editingTask ? 'Edit Task' : 'Create Task'}</h3>
              <button onClick={() => setShowTaskModal(false)}>âœ•</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Title</label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Description</label>
              <textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                rows={4}
                style={{ width: '100%' }}
                placeholder="Optional task description..."
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Due Date</label>
              <input
                type="datetime-local"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Priority</label>
              <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowTaskModal(false)}>Cancel</button>
              <button
                className="primary"
                onClick={async () => {
                  if (!taskTitle.trim()) return
                  try {
                    if (editingTask) {
                      await updateTask(editingTask.id, {
                        title: taskTitle,
                        description: taskDescription || undefined,
                        dueDate: taskDueDate || null,
                        priority: taskPriority as any
                      })
                      onInfo('Task updated')
                    } else {
                      await createTask(leadId, {
                        title: taskTitle,
                        description: taskDescription || undefined,
                        dueDate: taskDueDate || undefined,
                        priority: taskPriority as any
                      })
                      onInfo('Task created')
                    }
                    setTaskTitle('')
                    setTaskDescription('')
                    setTaskDueDate('')
                    setTaskPriority('MEDIUM')
                    setEditingTask(null)
                    setShowTaskModal(false)
                    await refreshTasks()
                  } catch (e) {
                    onError(e instanceof Error ? e.message : 'Failed to save task')
                  }
                }}
                disabled={!taskTitle.trim()}
              >
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          <button onClick={() => setViewMode('tasks')} style={{ fontWeight: viewMode === 'tasks' ? 'bold' : 'normal' }}>
            Tasks ({tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length})
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
          <button
            className="primary"
            onClick={() => setShowMessageModal(true)}
            style={{ fontSize: 14 }}
          >
            ðŸ“¨ Send Message
          </button>

          <button
            className="primary"
            onClick={() => setShowCallModal(true)}
            style={{ fontSize: 14 }}
          >
            ðŸ“ž Log Call
          </button>

          <button
            className="primary"
            onClick={() => {
              setEditingTask(null)
              setTaskTitle('')
              setTaskDescription('')
              setTaskDueDate('')
              setTaskPriority('MEDIUM')
              setShowTaskModal(true)
            }}
            style={{ fontSize: 14 }}
          >
            âœ… Add Task
          </button>

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
                        {item.data.direction} â€¢ {item.data.channel}
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
                        â€¢ {item.data.reason}
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
                        {item.data.type} â€¢ weight {item.data.weight}
                      </div>
                      {item.data.salesmanId ? (
                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Salesman: {item.data.salesmanId}</div>
                      ) : null}
                      {item.data.note ? <div style={{ marginTop: 4, opacity: 0.9 }}>{item.data.note}</div> : null}
                    </div>
                  ) : item.type === 'call' ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 16 }}>ðŸ“ž</span>
                        <Badge
                          kind={
                            item.data.outcome === 'ANSWERED' ? 'ok' : 
                            item.data.outcome === 'NO_ANSWER' || item.data.outcome === 'BUSY' ? 'warn' : 
                            'danger'
                          }
                          text={item.data.outcome.replace('_', ' ')}
                        />
                        {item.data.duration && (
                          <span style={{ fontSize: 13, opacity: 0.7 }}>
                            {Math.floor(item.data.duration / 60)}:{(item.data.duration % 60).toString().padStart(2, '0')}
                          </span>
                        )}
                      </div>
                      {item.data.notes && (
                        <div style={{ marginTop: 4, opacity: 0.9, fontSize: 14 }}>{item.data.notes}</div>
                      )}
                      {item.data.recordingUrl && (
                        <a href={item.data.recordingUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
                          ðŸŽ§ Listen to recording
                        </a>
                      )}
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
      ) : viewMode === 'tasks' ? (
        <div>
          <h3 style={{ marginTop: 0 }}>Tasks</h3>
          
          {tasks.length === 0 ? (
            <div style={{ opacity: 0.8 }}>No tasks yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tasks.map((task) => (
                <div key={task.id} className="sak-card" style={{ padding: 16, opacity: task.status === 'COMPLETED' || task.status === 'CANCELLED' ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge
                        kind={
                          task.status === 'COMPLETED' ? 'ok' :
                          task.status === 'IN_PROGRESS' ? 'warn' :
                          task.status === 'CANCELLED' ? 'muted' :
                          'danger'
                        }
                        text={task.status.replace('_', ' ')}
                      />
                      <Badge
                        kind={
                          task.priority === 'URGENT' ? 'danger' :
                          task.priority === 'HIGH' ? 'warn' :
                          'muted'
                        }
                        text={task.priority}
                      />
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleString() : 'No due date'}
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{task.title}</div>
                  {task.description && (
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, marginBottom: 8, opacity: 0.9 }}>
                      {task.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                      <>
                        <button
                          onClick={() => {
                            setEditingTask(task)
                            setTaskTitle(task.title)
                            setTaskDescription(task.description || '')
                            setTaskDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '')
                            setTaskPriority(task.priority)
                            setShowTaskModal(true)
                          }}
                          style={{ fontSize: 12 }}
                        >
                          âœï¸ Edit
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await updateTask(task.id, {
                                status: task.status === 'IN_PROGRESS' ? 'PENDING' : 'IN_PROGRESS'
                              })
                              onInfo('Task status updated')
                              await refreshTasks()
                            } catch (e) {
                              onError(e instanceof Error ? e.message : 'Failed to update task')
                            }
                          }}
                          style={{ fontSize: 12 }}
                        >
                          {task.status === 'IN_PROGRESS' ? 'â¸ï¸ Pause' : 'â–¶ï¸ Start'}
                        </button>
                        <button
                          className="primary"
                          onClick={async () => {
                            try {
                              await updateTask(task.id, { status: 'COMPLETED' })
                              onInfo('Task completed')
                              await refreshTasks()
                            } catch (e) {
                              onError(e instanceof Error ? e.message : 'Failed to complete task')
                            }
                          }}
                          style={{ fontSize: 12 }}
                        >
                          âœ“ Complete
                        </button>
                      </>
                    )}
                    <button
                      onClick={async () => {
                        if (confirm('Are you sure you want to delete this task?')) {
                          try {
                            await deleteTask(task.id)
                            onInfo('Task deleted')
                            await refreshTasks()
                          } catch (e) {
                            onError(e instanceof Error ? e.message : 'Failed to delete task')
                          }
                        }
                      }}
                      style={{ fontSize: 12, marginLeft: 'auto' }}
                    >
                      ðŸ—‘ï¸ Delete
                    </button>
                  </div>
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
                      <Badge kind={m.direction === 'IN' ? 'warn' : 'ok'} text={m.direction} /> â€¢ {m.channel} â€¢{' '}
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
                      â€¢ {it.reason}
                      {it.suggestedSalesmanId ? ` â€¢ suggested ${it.suggestedSalesmanId}` : ''}
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
                          {ev.type} â€¢ weight {ev.weight}
                          {ev.salesmanId ? ` â€¢ salesman ${ev.salesmanId}` : ''}
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
    </>
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
                  <span style={{ fontSize: 12, opacity: 0.7 }}>â€”</span>
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
                      Selectâ€¦
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
                  text={Number(s.capacity ?? 0) === 0 ? 'CAP âˆž' : `CAP ${Number(s.capacity ?? 0)}`}
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
        Each tenant can define what â€œsuccessâ€ means (with weights). Salesman scores are normalized to 0â€“100 based on success events in the last 30 days.
      </div>
    </div>
  )
}

function SettingsPage({ onError, onInfo }: { onError: (m: string) => void; onInfo: (m: string) => void }) {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      const { getAssignmentConfig } = await import('./lib/api')
      const data = await getAssignmentConfig()
      setConfig(data.config)
      setLoading(false)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to load settings')
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSave() {
    try {
      const { updateAssignmentConfig } = await import('./lib/api')
      await updateAssignmentConfig({
        strategy: config.strategy,
        autoAssign: config.autoAssign,
        considerCapacity: config.considerCapacity,
        considerScore: config.considerScore,
        considerSkills: config.considerSkills
      })
      onInfo('Settings saved successfully')
      await refresh()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to save settings')
    }
  }

  if (loading) return <div style={{ padding: 12 }}>Loading settings...</div>
  if (!config) return <div style={{ padding: 12 }}>No configuration found</div>

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Assignment Settings</h2>
        <button onClick={handleSave} className="button button--primary">
          Save Changes
        </button>
      </div>

      <div className="sak-card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Lead Assignment Strategy</h3>
        
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Assignment Strategy</span>
          <select
            value={config.strategy}
            onChange={(e) => setConfig({ ...config, strategy: e.target.value })}
            style={{ width: '100%', maxWidth: 400 }}
          >
            <option value="ROUND_ROBIN">Round Robin (Balanced Distribution)</option>
            <option value="LEAST_ACTIVE">Least Active (Lowest Workload First)</option>
            <option value="SKILLS_BASED">Skills Based (Coming Soon)</option>
            <option value="GEOGRAPHIC">Geographic (Coming Soon)</option>
            <option value="CUSTOM">Custom Rules (Coming Soon)</option>
          </select>
          <small style={{ display: 'block', marginTop: 4, opacity: 0.7 }}>
            Choose how leads are automatically assigned to salesmen
          </small>
        </label>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={config.autoAssign}
            onChange={(e) => setConfig({ ...config, autoAssign: e.target.checked })}
            style={{ marginRight: 8 }}
          />
          <span style={{ fontWeight: 600 }}>Enable Auto-Assignment</span>
          <small style={{ display: 'block', marginLeft: 24, marginTop: 4, opacity: 0.7 }}>
            Automatically assign new leads based on the selected strategy
          </small>
        </label>

        <h3>Strategy Options</h3>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={config.considerCapacity}
            onChange={(e) => setConfig({ ...config, considerCapacity: e.target.checked })}
            style={{ marginRight: 8 }}
          />
          <span style={{ fontWeight: 600 }}>Consider Salesman Capacity</span>
          <small style={{ display: 'block', marginLeft: 24, marginTop: 4, opacity: 0.7 }}>
            Do not assign to salesmen who have reached their capacity limit
          </small>
        </label>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={config.considerScore}
            onChange={(e) => setConfig({ ...config, considerScore: e.target.checked })}
            style={{ marginRight: 8 }}
          />
          <span style={{ fontWeight: 600 }}>Consider Salesman Score</span>
          <small style={{ display: 'block', marginLeft: 24, marginTop: 4, opacity: 0.7 }}>
            Prioritize salesmen with higher performance scores
          </small>
        </label>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={config.considerSkills}
            onChange={(e) => setConfig({ ...config, considerSkills: e.target.checked })}
            style={{ marginRight: 8 }}
            disabled
          />
          <span style={{ fontWeight: 600, opacity: 0.5 }}>Consider Skills Matching (Coming Soon)</span>
          <small style={{ display: 'block', marginLeft: 24, marginTop: 4, opacity: 0.7 }}>
            Match leads with salesmen based on product/service expertise
          </small>
        </label>
      </div>

      <div className="sak-card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>How It Works</h3>
        <ul style={{ paddingLeft: 20, lineHeight: 1.6 }}>
          <li><strong>Round Robin:</strong> Distributes leads evenly among all active salesmen, considering capacity and optionally scores</li>
          <li><strong>Least Active:</strong> Always assigns to the salesman with the fewest active leads</li>
          <li><strong>Skills Based:</strong> (Coming Soon) Match leads to salesmen based on product categories or expertise</li>
          <li><strong>Geographic:</strong> (Coming Soon) Assign based on lead location and salesman territories</li>
        </ul>
      </div>
    </div>
  )
}

function ReportsPage({ onError, onInfo }: { onError: (m: string) => void; onInfo: (m: string) => void }) {
  const [timeRange, setTimeRange] = useState<number>(30)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      setLoading(true)
      const { getTimeSeriesAnalytics, getSuccessAnalytics } = await import('./lib/api')
      const [timeSeries, successData] = await Promise.all([
        getTimeSeriesAnalytics(timeRange),
        getSuccessAnalytics(timeRange)
      ])
      setData({ ...timeSeries, ...successData })
      setLoading(false)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to load reports')
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange])

  async function handleExport(type: 'leads' | 'success' | 'salesmen') {
    try {
      const { exportAnalyticsReport } = await import('./lib/api')
      await exportAnalyticsReport(type)
      onInfo(`${type.charAt(0).toUpperCase() + type.slice(1)} report exported successfully`)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Export failed')
    }
  }

  if (loading) return <div style={{ padding: 12 }}>Loading reports...</div>
  if (!data) return <div style={{ padding: 12 }}>No data available</div>

  // Calculate totals
  const totalNewLeads = data.timeSeries?.reduce((sum: number, day: any) => sum + day.newLeads, 0) || 0
  const totalMessagesIn = data.timeSeries?.reduce((sum: number, day: any) => sum + day.messagesIn, 0) || 0
  const totalMessagesOut = data.timeSeries?.reduce((sum: number, day: any) => sum + day.messagesOut, 0) || 0
  const totalSuccessEvents = data.timeSeries?.reduce((sum: number, day: any) => sum + day.successEvents, 0) || 0
  const totalSuccessWeight = data.timeSeries?.reduce((sum: number, day: any) => sum + day.successWeight, 0) || 0

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Reports & Analytics</h2>
        <select value={timeRange} onChange={(e) => setTimeRange(Number(e.target.value))} style={{ padding: '6px 12px' }}>
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={60}>Last 60 Days</option>
          <option value={90}>Last 90 Days</option>
          <option value={180}>Last 6 Months</option>
          <option value={365}>Last Year</option>
        </select>
        <button onClick={refresh}>Refresh</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => handleExport('leads')} className="button">
            Export Leads
          </button>
          <button onClick={() => handleExport('success')} className="button">
            Export Success
          </button>
          <button onClick={() => handleExport('salesmen')} className="button">
            Export Salesmen
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div className="sak-card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#3b82f6' }}>{totalNewLeads}</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>New Leads</div>
        </div>
        <div className="sak-card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>{totalMessagesIn}</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>Messages Received</div>
        </div>
        <div className="sak-card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#8b5cf6' }}>{totalMessagesOut}</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>Messages Sent</div>
        </div>
        <div className="sak-card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#10b981' }}>{totalSuccessEvents}</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>Success Events</div>
        </div>
        <div className="sak-card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#ef4444' }}>{totalSuccessWeight.toFixed(0)}</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>Success Weight</div>
        </div>
      </div>

      {/* Time Series Chart */}
      <div className="sak-card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Activity Over Time</h3>
        {data.timeSeries && data.timeSeries.length > 0 ? (
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th align="left" style={{ padding: '8px 4px' }}>Date</th>
                  <th align="right" style={{ padding: '8px 4px' }}>New Leads</th>
                  <th align="right" style={{ padding: '8px 4px' }}>Msgs In</th>
                  <th align="right" style={{ padding: '8px 4px' }}>Msgs Out</th>
                  <th align="right" style={{ padding: '8px 4px' }}>Success</th>
                  <th align="right" style={{ padding: '8px 4px' }}>Weight</th>
                </tr>
              </thead>
              <tbody>
                {data.timeSeries.map((day: any) => (
                  <tr key={day.date} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 4px' }}>{day.date}</td>
                    <td align="right" style={{ padding: '8px 4px' }}>
                      <Badge kind={day.newLeads > 0 ? 'ok' : 'muted'} text={String(day.newLeads)} />
                    </td>
                    <td align="right" style={{ padding: '8px 4px' }}>
                      <Badge kind={day.messagesIn > 0 ? 'warn' : 'muted'} text={String(day.messagesIn)} />
                    </td>
                    <td align="right" style={{ padding: '8px 4px' }}>
                      <Badge kind={day.messagesOut > 0 ? 'ok' : 'muted'} text={String(day.messagesOut)} />
                    </td>
                    <td align="right" style={{ padding: '8px 4px' }}>
                      <Badge kind={day.successEvents > 0 ? 'ok' : 'muted'} text={String(day.successEvents)} />
                    </td>
                    <td align="right" style={{ padding: '8px 4px' }}>
                      <Badge kind={weightKind(day.successWeight)} text={String(day.successWeight.toFixed(0))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ opacity: 0.8 }}>No activity data in this time range</div>
        )}
      </div>

      {/* Channel Performance */}
      <div className="sak-card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Channel Performance</h3>
        {data.channelStats && data.channelStats.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th align="left" style={{ padding: '8px 4px' }}>Channel</th>
                <th align="right" style={{ padding: '8px 4px' }}>Total Leads</th>
                <th align="right" style={{ padding: '8px 4px' }}>Converted</th>
                <th align="right" style={{ padding: '8px 4px' }}>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.channelStats.map((ch: any) => (
                <tr key={ch.channel} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 4px', fontWeight: 600 }}>{ch.channel}</td>
                  <td align="right" style={{ padding: '8px 4px' }}>{ch.total}</td>
                  <td align="right" style={{ padding: '8px 4px' }}>
                    <Badge kind={ch.converted > 0 ? 'ok' : 'muted'} text={String(ch.converted)} />
                  </td>
                  <td align="right" style={{ padding: '8px 4px' }}>
                    <Badge
                      kind={
                        parseFloat(ch.conversionRate) >= 20
                          ? 'ok'
                          : parseFloat(ch.conversionRate) >= 10
                          ? 'warn'
                          : 'danger'
                      }
                      text={`${ch.conversionRate}%`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ opacity: 0.8 }}>No channel data available</div>
        )}
      </div>

      {/* Success Event Types */}
      <div className="sak-card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Success Events by Type</h3>
        {data.eventsByType && data.eventsByType.length > 0 ? (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {data.eventsByType.map((ev: any) => (
              <div key={ev.type} className="sak-card" style={{ padding: 12, borderRadius: 12, minWidth: 200 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{ev.type}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6', marginBottom: 4 }}>{ev.count}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Weight: {ev.weight}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.8 }}>No success events in this time range</div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="sak-card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Top Performers</h3>
        {data.leaderboard && data.leaderboard.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th align="left" style={{ padding: '8px 4px' }}>Salesman</th>
                <th align="right" style={{ padding: '8px 4px' }}>Events</th>
                <th align="right" style={{ padding: '8px 4px' }}>Total Weight</th>
              </tr>
            </thead>
            <tbody>
              {data.leaderboard.map((s: any, idx: number) => (
                <tr key={s.salesmanId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {idx < 3 && (
                        <span style={{ fontSize: 18 }}>
                          {idx === 0 ? 'ðŸ¥‡' : idx === 1 ? 'ðŸ¥ˆ' : 'ðŸ¥‰'}
                        </span>
                      )}
                      <span style={{ fontWeight: 600 }}>{s.displayName}</span>
                    </div>
                  </td>
                  <td align="right" style={{ padding: '8px 4px' }}>{s.events}</td>
                  <td align="right" style={{ padding: '8px 4px' }}>
                    <Badge kind={weightKind(s.weight)} text={String(s.weight.toFixed(0))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ opacity: 0.8 }}>No performance data yet</div>
        )}
      </div>
    </div>
  )
}

function ActivityFeedPage({ onError, onInfo }: { onError: (m: string) => void; onInfo: (m: string) => void }) {
  const [feed, setFeed] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(50)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getActivityFeed(limit)
      setFeed(data.feed || [])
      if (data.feed && data.feed.length > 0) {
        onInfo(`Loaded ${data.feed.length} activities`)
      }
    } catch (err) {
      onError('Failed to load activity feed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [limit])

  const getIcon = (type: string) => {
    switch (type) {
      case 'event': return 'ðŸ“…'
      case 'note': return 'ðŸ“'
      case 'call': return 'ðŸ“ž'
      case 'task': return 'âœ“'
      default: return 'â€¢'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'event': return '#3b82f6'
      case 'note': return '#8b5cf6'
      case 'call': return '#10b981'
      case 'task': return '#f59e0b'
      default: return '#6b7280'
    }
  }

  const formatTime = (time: string) => {
    const date = new Date(time)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Activity Feed</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}
          >
            <option value={25}>Last 25</option>
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading && feed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
          Loading activity...
        </div>
      ) : feed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
          No activity yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {feed.map((item, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '1rem',
                display: 'flex',
                gap: '1rem',
                transition: 'box-shadow 0.2s'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: `${getTypeColor(item.type)}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  flexShrink: 0
                }}
              >
                {getIcon(item.type)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.125rem 0.5rem',
                        backgroundColor: getTypeColor(item.type),
                        color: 'white',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        marginRight: '0.5rem'
                      }}
                    >
                      {item.type}
                    </span>
                    {item.data.leadName && (
                      <span style={{ fontWeight: '600', color: '#111827' }}>
                        {item.data.leadName}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {formatTime(item.time)}
                  </span>
                </div>
                <div style={{ color: '#374151', fontSize: '0.875rem' }}>
                  {item.type === 'event' && (
                    <div>
                      <strong>{item.data.outcome}</strong> - {item.data.message}
                      {item.data.userName && <span style={{ color: '#6b7280' }}> by {item.data.userName}</span>}
                    </div>
                  )}
                  {item.type === 'note' && (
                    <div>
                      {item.data.body}
                      {item.data.userName && <span style={{ color: '#6b7280' }}> â€” {item.data.userName}</span>}
                    </div>
                  )}
                  {item.type === 'call' && (
                    <div>
                      <strong>{item.data.answered ? 'Answered' : 'Missed'}</strong> call
                      {item.data.duration && <span> â€” {Math.floor(item.data.duration / 60)}m {item.data.duration % 60}s</span>}
                      {item.data.userName && <span style={{ color: '#6b7280' }}> by {item.data.userName}</span>}
                    </div>
                  )}
                  {item.type === 'task' && (
                    <div>
                      <strong>{item.data.completed ? 'Completed' : 'Created'}</strong>: {item.data.title}
                      {item.data.userName && <span style={{ color: '#6b7280' }}> by {item.data.userName}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AuditLogsPage({ onError, onInfo }: { onError: (m: string) => void; onInfo: (m: string) => void }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(100)
  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params: any = { limit }
      if (entityType) params.entityType = entityType
      if (entityId) params.entityId = entityId
      
      const data = await getAuditLogs(params)
      setLogs(data.logs || [])
      onInfo(`Loaded ${data.logs?.length || 0} audit logs`)
    } catch (err) {
      onError('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, entityType, entityId])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString()
  }

  const formatChanges = (changes: any) => {
    if (!changes) return 'N/A'
    try {
      const obj = typeof changes === 'string' ? JSON.parse(changes) : changes
      return Object.entries(obj).map(([key, val]) => `${key}: ${JSON.stringify(val)}`).join(', ')
    } catch {
      return JSON.stringify(changes)
    }
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Audit Logs</h1>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          style={{
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        >
          <option value={50}>Last 50</option>
          <option value={100}>Last 100</option>
          <option value={250}>Last 250</option>
          <option value={500}>Last 500</option>
        </select>

        <input
          type="text"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          placeholder="Filter by entity type (Lead, Note, etc.)"
          style={{
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            minWidth: '250px'
          }}
        />

        <input
          type="text"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          placeholder="Filter by entity ID"
          style={{
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            minWidth: '200px'
          }}
        />

        {(entityType || entityId) && (
          <button
            onClick={() => {
              setEntityType('')
              setEntityId('')
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {loading && logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
          Loading audit logs...
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
          No audit logs found
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Time</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>User</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Action</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Entity</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Entity ID</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Changes</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb'
                  }}
                >
                  <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                    {formatDate(log.createdAt)}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {log.userId?.slice(0, 8) || 'System'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{log.entityType}</td>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {log.entityId?.slice(0, 12)}
                  </td>
                  <td style={{ padding: '0.75rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {formatChanges(log.changes)}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.75rem', opacity: 0.7 }}>
                    {log.ipAddress || 'â€”'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
      <Routes>
        <Route path="/login" element={<LoginPage onError={onError} onLoggedIn={(u) => setSession({ loading: false, user: u })} />} />
        <Route path="/*" element={
          <RequireAuth session={session}>
            <AppLayout2025 
              user={session.user} 
              onLogout={() => {
                if (authMode() === 'dev_headers') {
                  saveDevAuth({ userId: '', role: 'MANAGER', tenantId: '' })
                }
                setSession({ loading: false, user: null })
              }}
            >
              {authMode() === 'dev_headers' && <DevSetup onInfo={onInfo} onError={onError} />}
              {toast && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-soft-lg border border-white/20 animate-fade-in">
                  <span className={toast.kind === 'error' ? 'text-red-600' : 'text-mint-600'}>{toast.message}</span>
                </div>
              )}
              <Routes>
                {authMode() === 'dev_headers' && <Route path="/dev-setup" element={<DevSetup onError={onError} onInfo={onInfo} />} />}
                <Route path="/" element={<DashboardPage onError={onError} />} />
                <Route path="/leads" element={<LeadsPage onError={onError} />} />
                <Route path="/leads/:id" element={<LeadDetailPage onError={onError} onInfo={onInfo} role={session.user?.role ?? null} />} />
                <Route path="/triage" element={<TriagePage onError={onError} onInfo={onInfo} />} />
                <Route path="/salesmen" element={<SalesmenPage onError={onError} onInfo={onInfo} />} />
                <Route path="/reports" element={<ReportsPage onError={onError} onInfo={onInfo} />} />
                <Route path="/activity-feed" element={<ActivityFeedPage onError={onError} onInfo={onInfo} />} />
                <Route path="/audit-logs" element={<AuditLogsPage onError={onError} onInfo={onInfo} />} />
                <Route path="/success" element={<SuccessPage onError={onError} onInfo={onInfo} />} />
                <Route path="/settings" element={<SettingsPage onError={onError} onInfo={onInfo} />} />
                <Route path="/ai" element={<AiPage onError={onError} onInfo={onInfo} />} />
                <Route path="/bots" element={<BotsPage onError={onError} onInfo={onInfo} />} />
                <Route path="/ingest" element={<IngestPage onError={onError} onInfo={onInfo} />} />
              </Routes>
            </AppLayout2025>
          </RequireAuth>
        } />
      </Routes>
    </>
  )
}

export default App
