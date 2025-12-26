import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LoginPage } from './components/LoginPage'
import { Leads2025 } from './components/Leads2025'
import { Dashboard2025 } from './components/Dashboard2025'
import { AppLayout2025 } from './components/AppLayout2025'
import { Triage2025 } from './components/Triage2025'
import { Salesmen2025 } from './components/Salesmen2025'
import { Reports2025 } from './components/Reports2025'
import { ActivityFeed2025 } from './components/ActivityFeed2025'
import { AuditLogs2025 } from './components/AuditLogs2025'
import { Success2025 } from './components/Success2025'
import { Settings2025 } from './components/Settings2025'
import { AI2025 } from './components/AI2025'
import { LeadDetail2025 } from './components/LeadDetail2025'
import { Bots2025 } from './components/Bots2025'
import { Ingest2025 } from './components/Ingest2025'
import {
  authMode,
  // assignLead,
  assignTriageItem,
  bulkAssignLeads,
  bulkUpdateLeadStatus,
  closeTriageItem,
  createSuccessDefinition,
  devBootstrap,
  devSeed,
  exportLeadsCsv,
  getAuditLogs,
  getUnreadNotificationCount,
  getSuccessAnalytics,
  getAiConfig,
  getLead,
  // getLeadNotes,
  // addLeadNote,
  // getLeadCalls,
  // logCall,
  // getLeadTasks,
  // createTask,
  // updateTask,
  // deleteTask,
  // listMessageTemplates,
  sendLeadMessage,
  importLeadsCsv,
  listNotifications,
  listLeads,
  listSalesmen,
  listSuccessDefinitions,
  listTriage,
  loadDevAuth,
  logout,
  markAllNotificationsRead,
  markNotificationRead,
  me,
  recomputeScores,
  // recordLeadSuccess,
  saveDevAuth,
  reopenTriageItem,
  type Notification,
  // type TriageStatusFilter,  // Unused in new Triage2025
  type SessionUser,
  updateAiConfig,
  createSalesman,
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

// Old helper function - kept for reference
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function triageReasonKind(reason: string): 'ok' | 'warn' | 'danger' | 'muted' {
  const r = reason.toLowerCase()
  if (r.includes('pricing') || r.includes('price')) return 'danger'
  if (r.includes('uncertain') || r.includes('unknown') || r.includes('not sure')) return 'warn'
  if (r.includes('handoff') || r.includes('human')) return 'warn'
  return 'muted'
}

// Old helper - kept for reference
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function scoreKind(score: number): 'ok' | 'warn' | 'danger' | 'muted' {
  if (!Number.isFinite(score)) return 'muted'
  if (score >= 70) return 'ok'
  if (score >= 40) return 'warn'
  return 'danger'
}

// @ts-ignore - unused helper
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
    { to: '/', label: 'Dashboard', icon: '📊' },
    { to: '/leads', label: t('leads'), icon: '👥' },
    { to: '/triage', label: t('triage'), icon: '🎯' },
    { to: '/salesmen', label: 'Salesmen', icon: '👔' },
    { to: '/reports', label: 'Reports', icon: '📈' },
    { to: '/activity-feed', label: 'Activity', icon: '⚡' },
    ...(session.user?.role === 'ADMIN' ? [{ to: '/audit-logs', label: 'Audit', icon: '🔍' }] : []),
    { to: '/success', label: 'Success', icon: '🎉' },
    { to: '/settings', label: 'Settings', icon: '⚙️' },
    { to: '/ai', label: 'AI', icon: '🤖' },
    { to: '/bots', label: 'Bots', icon: '🔧' },
    { to: '/ingest', label: 'Ingest', icon: '📥' },
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
            <span className="sak-sidebar__logo-icon">🎯</span>
            {!sidebarCollapsed && <span className="sak-sidebar__logo-text">{t('appTitle')}</span>}
          </div>
          <button 
            className="sak-sidebar__toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand' : 'Collapse'}
          >
            {sidebarCollapsed ? '→' : '←'}
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
              <option value="en">🌐 EN</option>
              <option value="ar">🌐 AR</option>
            </select>

            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button
                className="sak-header__btn"
                onClick={() => setNotificationsOpen((v) => !v)}
              >
                <span style={{ fontSize: '18px' }}>🔔</span>
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
                          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔕</div>
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
                              if (t.includes('lead')) return '👤'
                              if (t.includes('task')) return '✓'
                              if (t.includes('call')) return '📞'
                              if (t.includes('message')) return '💬'
                              if (t.includes('success') || t.includes('won')) return '🎉'
                              if (t.includes('urgent') || t.includes('hot')) return '🔥'
                              return '📢'
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
                                      ✓
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
                      <span>🚪</span>
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

  const handleApiKeyChange = (key: string) => {
    setOpenaiApiKey(key)
    setKeyTouched(true)
  }

  const handleSave = async () => {
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
  }

  return (
    <AI2025
      config={config}
      provider={provider}
      openaiModel={openaiModel}
      openaiApiKey={openaiApiKey}
      keyTouched={keyTouched}
      onProviderChange={setProvider}
      onModelChange={setOpenaiModel}
      onApiKeyChange={handleApiKeyChange}
      onSave={handleSave}
      onRefresh={refresh}
    />
  )
}

function BotsPage({ onError, onInfo }: { onError: (m: string) => void; onInfo: (m: string) => void }) {
  return <Bots2025 onError={onError} onInfo={onInfo} />
}

function IngestPage({ onError, onInfo }: { onError: (m: string) => void; onInfo: (m: string) => void }) {
  return <Ingest2025 onError={onError} onInfo={onInfo} />
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

  const handleDelete = async (leadId: string) => {
    const { deleteLead } = await import('./lib/api')
    await deleteLead(leadId)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <Leads2025 leads={leads} onRefresh={refresh} onExport={handleExport} onDelete={handleDelete} />
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
            <option value="HOT">🔥 HOT</option>
            <option value="WARM">🌡️ WARM</option>
            <option value="QUALIFIED">✓ QUALIFIED</option>
            <option value="COLD">❄️ COLD</option>
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
            {sortOrder === 'asc' ? '↑' : '↓'}
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
                  <span style={{ opacity: 0.5 }}>—</span>
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

// Modern Lead Detail Page using 2025 design
function LeadDetailPage({ onError, onInfo }: { onError: (m: string) => void; onInfo: (m: string) => void }) {
  const params = useParams()
  const leadId = params.id ?? ''
  const [lead, setLead] = useState<any | null>(null)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId])

  if (!lead) return <div style={{ padding: 12 }}>Loading…</div>

  // Use modern LeadDetail2025 component
  return (
    <LeadDetail2025
      lead={lead}
      onRefresh={refresh}
      onSendMessage={async (content: string) => {
        try {
          await sendLeadMessage(leadId, 'WHATSAPP', content)
          onInfo('Message sent!')
          refresh()
        } catch (e) {
          onError(e instanceof Error ? e.message : 'Failed to send message')
        }
      }}
      onUpdateStatus={async (status: string) => {
        try {
          await updateLeadStatus(leadId, status)
          onInfo(`Status updated to ${status}`)
          refresh()
        } catch (e) {
          onError(e instanceof Error ? e.message : 'Failed to update status')
        }
      }}
    />
  )
}

function TriagePage({ onError, onInfo }: { onError: (m: string) => void; onInfo: (m: string) => void }) {
  const [items, setItems] = useState<any[]>([])
  const [salesmen, setSalesmen] = useState<any[]>([])

  async function refresh() {
    try {
      const [triage, sm] = await Promise.all([listTriage('ALL'), listSalesmen()])
      setItems(triage.items)
      setSalesmen(sm.salesmen)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed')
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleAssign = async (itemId: string, salesmanId: string) => {
    try {
      await assignTriageItem(itemId, salesmanId)
      onInfo('Triage assigned')
      await refresh()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleClose = async (itemId: string, reason: string) => {
    try {
      await closeTriageItem(itemId, { note: reason })
      onInfo('Closed')
      await refresh()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleReopen = async (itemId: string) => {
    try {
      await reopenTriageItem(itemId)
      onInfo('Reopened')
      await refresh()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed')
    }
  }

  const triageItems = items.map(item => ({
    id: item.id,
    type: item.reason,
    createdAt: item.createdAt,
    assignedTo: item.suggestedSalesmanId,
    assignedToName: salesmen.find(s => s.id === item.suggestedSalesmanId)?.displayName,
    status: item.status === 'OPEN' ? 'NEW' as const : item.status === 'ASSIGNED' ? 'IN_PROGRESS' as const : 'CLOSED' as const,
    leadId: item.lead?.id,
    leadName: item.lead?.fullName || item.lead?.phone,
    channel: item.lead?.channel,
    message: item.lead?.lastMessage,
    closedReason: item.closeNote,
  }))

  return (
    <Triage2025 
      items={triageItems}
      salesmen={salesmen.map(s => ({ id: s.id, name: s.displayName }))}
      onAssign={handleAssign}
      onClose={handleClose}
      onReopen={handleReopen}
      onRefresh={refresh}
    />
  )
}

function SalesmenPage({ onError, onInfo }: { onError: (m: string) => void; onInfo: (m: string) => void }) {
  const [salesmen, setSalesmen] = useState<any[]>([])

  async function refresh() {
    try {
      const out = await listSalesmen()
      setSalesmen(out.salesmen)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed')
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleUpdate = async (id: string, updates: any) => {
    try {
      await updateSalesman(id, updates)
      onInfo('Salesman updated')
      await refresh()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleCreate = async (salesman: { displayName: string; username: string; password: string; role: string }) => {
    try {
      await createSalesman(salesman)
      onInfo('Salesman created successfully')
      await refresh()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to create salesman')
    }
  }

  return (
    <Salesmen2025
      salesmen={salesmen}
      onUpdate={handleUpdate}
      onCreate={handleCreate}
      onRefresh={refresh}
    />
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

  const handleNewDefinitionChange = (field: 'name' | 'type' | 'weight', value: any) => {
    if (field === 'name') setName(value)
    else if (field === 'type') setType(value)
    else if (field === 'weight') setWeight(value)
  }

  const handleDefinitionChange = (id: string, field: 'name' | 'weight' | 'isActive', value: any) => {
    setDefs((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)))
  }

  const handleCreateDefinition = async () => {
    try {
      await createSuccessDefinition({ name, type, weight })
      onInfo('Created')
      await refresh()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const handleSaveDefinition = async (id: string) => {
    try {
      const def = defs.find((d) => d.id === id)
      if (!def) return
      await updateSuccessDefinition(id, { name: def.name, weight: Number(def.weight), isActive: Boolean(def.isActive) })
      onInfo('Saved')
      await refresh()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const handleRecomputeScores = async () => {
    try {
      const out = await recomputeScores()
      onInfo(`Scores recomputed (${out.updates.length})`)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <Success2025
      definitions={defs}
      analytics={analytics}
      newDefinition={{ name, type, weight }}
      onNewDefinitionChange={handleNewDefinitionChange}
      onDefinitionChange={handleDefinitionChange}
      onCreateDefinition={handleCreateDefinition}
      onSaveDefinition={handleSaveDefinition}
      onRecomputeScores={handleRecomputeScores}
      onRefresh={refresh}
    />
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

  const handleConfigChange = (field: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [field]: value }))
  }

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

  return (
    <Settings2025
      config={config}
      loading={loading}
      onConfigChange={handleConfigChange}
      onSave={handleSave}
    />
  )
}

function ReportsPage({ onError, onInfo }: { onError: (m: string) => void; onInfo: (m: string) => void }) {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [reportData, setReportData] = useState<any>(null)

  async function refresh() {
    try {
      const { listLeads, listSalesmen } = await import('./lib/api')
      const [leadsResult, salesmenResult] = await Promise.all([
        listLeads(),
        listSalesmen()
      ])

      const leads = leadsResult.leads || []
      const salesmen = salesmenResult.salesmen || []

      // Filter by date range
      const start = new Date(startDate)
      const end = new Date(endDate)
      const filteredLeads = leads.filter((lead: any) => {
        const createdAt = new Date(lead.createdAt)
        return createdAt >= start && createdAt <= end
      })

      // Calculate metrics
      const totalLeads = filteredLeads.length
      const newLeads = filteredLeads.filter((l: any) => l.status === 'NEW').length
      const convertedLeads = filteredLeads.filter((l: any) => l.status === 'WON').length
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
      const averageScore = totalLeads > 0 ? filteredLeads.reduce((sum: number, l: any) => sum + (l.score || 0), 0) / totalLeads : 0

      // Top salesmen
      const salesmenStats = salesmen.map((s: any) => {
        const salesmanLeads = filteredLeads.filter((l: any) => l.assignedTo === s.id)
        const conversions = salesmanLeads.filter((l: any) => l.status === 'WON').length
        const rate = salesmanLeads.length > 0 ? (conversions / salesmanLeads.length) * 100 : 0
        return { name: s.displayName, conversions, rate }
      }).sort((a, b) => b.conversions - a.conversions).slice(0, 6)

      // Leads by channel
      const channelCounts: Record<string, number> = {}
      filteredLeads.forEach((lead: any) => {
        const channel = lead.channel || 'WEB'
        channelCounts[channel] = (channelCounts[channel] || 0) + 1
      })
      const leadsByChannel = Object.entries(channelCounts).map(([channel, count]) => ({ channel, count }))
        .sort((a, b) => b.count - a.count)

      // Daily trend (last 7 days)
      const dailyTrend = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(end)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        const dayLeads = filteredLeads.filter((l: any) => l.createdAt.startsWith(dateStr))
        const dayConversions = dayLeads.filter((l: any) => l.status === 'WON').length
        dailyTrend.push({ date: dateStr, leads: dayLeads.length, conversions: dayConversions })
      }

      setReportData({
        totalLeads,
        newLeads,
        convertedLeads,
        conversionRate,
        averageScore,
        topSalesmen: salesmenStats,
        leadsByChannel,
        dailyTrend,
      })
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to load reports')
    }
  }

  useEffect(() => {
    refresh()
  }, [startDate, endDate])

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
  }

  const handleExport = async () => {
    try {
      const { exportLeadsCsv } = await import('./lib/api')
      await exportLeadsCsv()
      onInfo('Report exported successfully')
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Export failed')
    }
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading reports...</div>
      </div>
    )
  }

  return (
    <Reports2025
      data={reportData}
      startDate={startDate}
      endDate={endDate}
      onDateChange={handleDateChange}
      onExport={handleExport}
      onRefresh={refresh}
    />
  )
}

function ActivityFeedPage({ onError, onInfo }: { onError: (m: string) => void; onInfo: (m: string) => void }) {
  const [feed, setFeed] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(50)

  const load = async () => {
    setLoading(true)
    try {
      const { getActivityFeed } = await import('./lib/api')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit])

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
  }

  return (
    <ActivityFeed2025
      feed={feed}
      loading={loading}
      limit={limit}
      onLimitChange={handleLimitChange}
      onRefresh={load}
    />
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

  const handleClearFilters = () => {
    setEntityType('')
    setEntityId('')
  }

  return (
    <AuditLogs2025
      logs={logs}
      loading={loading}
      limit={limit}
      entityType={entityType}
      entityId={entityId}
      onLimitChange={setLimit}
      onEntityTypeChange={setEntityType}
      onEntityIdChange={setEntityId}
      onClearFilters={handleClearFilters}
      onRefresh={load}
    />
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
                <Route path="/leads/:id" element={<LeadDetailPage onError={onError} onInfo={onInfo} />} />
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
