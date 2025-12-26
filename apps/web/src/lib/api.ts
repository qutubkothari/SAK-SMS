export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALESMAN'

export type AuthMode = 'cookie' | 'dev_headers'

export function authMode(): AuthMode {
  const mode = (import.meta as any).env?.VITE_AUTH_MODE as string | undefined
  if (mode === 'dev_headers') return 'dev_headers'
  if (mode === 'cookie') return 'cookie'
  return (import.meta as any).env?.DEV ? 'dev_headers' : 'cookie'
}

export type DevAuth = {
  tenantId: string
  userId: string
  role: Role
}

const STORAGE_KEY = 'sak.devAuth'

const TENANT_KEY = 'sak.tenantId'

export function loadTenantId(): string {
  return localStorage.getItem(TENANT_KEY) ?? ''
}

export function saveTenantId(tenantId: string) {
  localStorage.setItem(TENANT_KEY, tenantId)
}

export function loadDevAuth(): DevAuth {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return { tenantId: '', userId: '', role: 'MANAGER' }
  }
  try {
    return JSON.parse(raw) as DevAuth
  } catch {
    return { tenantId: '', userId: '', role: 'MANAGER' }
  }
}

export function saveDevAuth(auth: DevAuth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
}

function baseUrl(): string {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
  return import.meta.env.DEV ? 'http://localhost:4000' : '/api'
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)

  if (authMode() === 'dev_headers') {
    const auth = loadDevAuth()
    if (auth.tenantId) headers.set('x-tenant-id', auth.tenantId)
    if (auth.userId) headers.set('x-user-id', auth.userId)
    if (auth.role) headers.set('x-role', auth.role)
  } else {
    const tenantId = loadTenantId()
    if (tenantId) headers.set('x-tenant-id', tenantId)
  }

  if (!headers.has('content-type')) headers.set('content-type', 'application/json')

  const res = await fetch(`${baseUrl()}${path}`, { ...init, headers, credentials: 'include' })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message = (data as any)?.error ?? `HTTP ${res.status}`
    throw new Error(message)
  }

  return data as T
}

export type SessionUser = {
  id: string
  tenantId: string
  role: Role
  email: string
  displayName: string
}

export async function login(payload: { phone: string; password: string }) {
  return request<{ ok: true; user: SessionUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function me() {
  return request<{ ok: true; user: SessionUser }>('/auth/me')
}

export async function logout() {
  return request<{ ok: true }>('/auth/logout', { method: 'POST' })
}

export type Notification = {
  id: string
  type: string
  title: string
  body?: string | null
  entityType?: string | null
  entityId?: string | null
  readAt?: string | null
  createdAt: string
}

export async function listNotifications(payload?: { unreadOnly?: boolean; limit?: number }) {
  const q = new URLSearchParams()
  if (payload?.unreadOnly) q.set('unreadOnly', '1')
  if (payload?.limit) q.set('limit', String(payload.limit))
  const suffix = q.toString() ? `?${q.toString()}` : ''
  return request<{ notifications: Notification[] }>(`/notifications${suffix}`)
}

export async function getUnreadNotificationCount() {
  return request<{ count: number }>('/notifications/unread-count')
}

export async function markNotificationRead(id: string) {
  return request<{ ok: true }>(`/notifications/${id}/read`, { method: 'POST', body: '{}' })
}

export async function markAllNotificationsRead() {
  return request<{ ok: true }>('/notifications/read-all', { method: 'POST', body: '{}' })
}

export type Lead = {
  id: string
  channel: string
  fullName?: string | null
  phone?: string | null
  email?: string | null
  language: string
  heat: string
  status: string
  assignedToSalesmanId?: string | null
  createdAt: string
  updatedAt: string
}

export type TriageItem = {
  id: string
  reason: string
  status: string
  suggestedSalesmanId?: string | null
  createdAt: string
  lead: Lead
}

export type TriageStatusFilter = 'OPEN' | 'ASSIGNED' | 'CLOSED' | 'ALL'

export type Salesman = {
  id: string
  displayName: string
  email: string
  isActive: boolean
  score: number
  capacity: number
  activeLeadCount: number
}

export type Bot = {
  id: string
  name: string
  department?: string | null
  productTag?: string | null
  pricingMode: 'ROUTE' | 'STANDARD'
  isActive: boolean
}

export type SuccessEventType = 'DEMO_BOOKED' | 'PAYMENT_RECEIVED' | 'ORDER_RECEIVED' | 'CONTRACT_SIGNED' | 'CUSTOM'

export type SuccessDefinition = {
  id: string
  name: string
  type: SuccessEventType
  weight: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type AiProvider = 'MOCK' | 'OPENAI' | 'GEMINI'

export type TenantAiConfig = {
  tenantId: string
  provider: AiProvider
  openaiModel: string | null
  hasOpenaiApiKey: boolean
}

export async function getHealth() {
  return request<{ ok: boolean }>('/health')
}

export async function listLeads() {
  return request<{ leads: Lead[] }>('/leads')
}

export async function exportLeadsCsv() {
  const url = `${baseUrl()}/leads/export/csv`
  const headers = new Headers()
  
  if (authMode() === 'dev_headers') {
    const auth = loadDevAuth()
    if (auth.tenantId) headers.set('x-tenant-id', auth.tenantId)
    if (auth.userId) headers.set('x-user-id', auth.userId)
    if (auth.role) headers.set('x-role', auth.role)
  } else {
    const tenantId = loadTenantId()
    if (tenantId) headers.set('x-tenant-id', tenantId)
  }

  const response = await fetch(url, { headers, credentials: 'include' })
  if (!response.ok) throw new Error('Export failed')
  
  const blob = await response.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(downloadUrl)
}

export async function importLeadsCsv(csvData: string) {
  return request<{ ok: boolean; created: number; skipped: number; errors: string[] }>('/leads/import/csv', {
    method: 'POST',
    body: JSON.stringify({ csvData })
  })
}

export async function getLead(id: string) {
  return request<{ lead: any }>(`/leads/${id}`)
}

export async function deleteLead(id: string) {
  return request<{ ok: true; deletedLeadId: string }>(`/leads/${id}`, {
    method: 'DELETE'
  })
}

export async function deleteAllEmailLeads() {
  return request<{ ok: true; deletedCount: number }>(`/admin/gmail-leads`, {
    method: 'DELETE'
  })
}

export async function updateLeadStatus(id: string, status: string) {
  return request<{ ok: true }>(`/leads/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status })
  })
}

export async function listSalesmen() {
  return request<{ salesmen: Salesman[] }>('/salesmen')
}

export async function createSalesman(payload: { displayName: string; username: string; password: string; role: string }) {
  return request<{ salesman: Salesman }>('/salesmen', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateSalesman(id: string, payload: any) {
  return request<{ ok: true }>(`/salesmen/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function assignLead(id: string, salesmanId: string | null) {
  return request<{ ok: true }>(`/leads/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ salesmanId })
  })
}

export async function bulkAssignLeads(leadIds: string[], salesmanId: string | null) {
  return request<{ ok: true; count: number }>('/leads/bulk/assign', {
    method: 'POST',
    body: JSON.stringify({ leadIds, salesmanId })
  })
}

export async function bulkUpdateLeadStatus(leadIds: string[], status: string) {
  return request<{ ok: true; count: number }>('/leads/bulk/status', {
    method: 'POST',
    body: JSON.stringify({ leadIds, status })
  })
}

export async function listTriage(status: TriageStatusFilter = 'OPEN') {
  const q = status ? `?status=${encodeURIComponent(status)}` : ''
  return request<{ items: TriageItem[] }>(`/triage${q}`)
}

export async function assignTriageItem(triageId: string, salesmanId: string) {
  return request<{ ok: true }>(`/triage/${triageId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ salesmanId })
  })
}

export async function closeTriageItem(triageId: string, payload?: { note?: string }) {
  return request<{ ok: true }>(`/triage/${triageId}/close`, {
    method: 'POST',
    body: JSON.stringify(payload ?? {})
  })
}

export async function reopenTriageItem(triageId: string) {
  return request<{ ok: true }>(`/triage/${triageId}/reopen`, { method: 'POST', body: '{}' })
}

export async function getLeadNotes(leadId: string) {
  return request<{ notes: Array<{ id: string; content: string; createdAt: string; updatedAt: string; user: { id: string; displayName: string; email: string | null } }> }>(`/leads/${leadId}/notes`)
}

export async function addLeadNote(leadId: string, content: string) {
  return request<{ ok: true; note: { id: string; content: string; createdAt: string } }>(`/leads/${leadId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ content })
  })
}

export type CallOutcome = 'NO_ANSWER' | 'BUSY' | 'ANSWERED' | 'VOICEMAIL' | 'DISCONNECTED' | 'WRONG_NUMBER'
export type CallDirection = 'INBOUND' | 'OUTBOUND'

export async function getLeadCalls(leadId: string) {
  return request<{ 
    calls: Array<{ 
      id: string
      direction: CallDirection
      outcome: CallOutcome
      duration: number | null
      notes: string | null
      recordingUrl: string | null
      createdAt: string
      updatedAt: string
      userId: string
    }> 
  }>(`/leads/${leadId}/calls`)
}

export async function logCall(
  leadId: string, 
  payload: { 
    direction: CallDirection
    outcome: CallOutcome
    duration?: number
    notes?: string
    recordingUrl?: string 
  }
) {
  return request<{ 
    ok: true
    call: { 
      id: string
      direction: CallDirection
      outcome: CallOutcome
      duration: number | null
      notes: string | null
      recordingUrl: string | null
      createdAt: string 
    } 
  }>(`/leads/${leadId}/calls`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export async function getLeadTasks(leadId: string) {
  return request<{
    tasks: Array<{
      id: string
      title: string
      description: string | null
      dueDate: string | null
      priority: TaskPriority
      status: TaskStatus
      completedAt: string | null
      createdAt: string
      updatedAt: string
      userId: string
    }>
  }>(`/leads/${leadId}/tasks`)
}

export async function createTask(
  leadId: string,
  payload: {
    title: string
    description?: string
    dueDate?: string
    priority?: TaskPriority
    assignedUserId?: string
  }
) {
  return request<{
    ok: true
    task: {
      id: string
      title: string
      description: string | null
      dueDate: string | null
      priority: TaskPriority
      status: TaskStatus
      createdAt: string
    }
  }>(`/leads/${leadId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateTask(
  taskId: string,
  payload: {
    title?: string
    description?: string
    dueDate?: string | null
    priority?: TaskPriority
    status?: TaskStatus
  }
) {
  return request<{ ok: true; task: any }>(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
}

export async function deleteTask(taskId: string) {
  return request<{ ok: true }>(`/tasks/${taskId}`, {
    method: 'DELETE'
  })
}

export async function getAllTasks(status?: TaskStatus) {
  const query = status ? `?status=${status}` : ''
  return request<{
    tasks: Array<{
      id: string
      title: string
      description: string | null
      dueDate: string | null
      priority: TaskPriority
      status: TaskStatus
      completedAt: string | null
      createdAt: string
      lead: {
        id: string
        fullName: string | null
        phone: string | null
      }
    }>
  }>(`/tasks${query}`)
}

// Lead Scoring
export async function recalculateLeadScore(leadId: string) {
  return request<{ ok: true; score: number; qualificationLevel: string | null; lastActivityAt: string | null }>(`/leads/${leadId}/recalculate-score`, {
    method: 'POST',
    body: '{}'
  })
}

export async function bulkRecalculateScores() {
  return request<{ ok: true; totalLeads: number; updated: number }>('/leads/bulk/recalculate-scores', {
    method: 'POST',
    body: '{}'
  })
}

// Activity Feed
export async function getActivityFeed(limit?: number) {
  const query = limit ? `?limit=${limit}` : ''
  return request<{
    feed: Array<{
      time: string
      type: string
      data: any
    }>
  }>(`/activity-feed${query}`)
}

// Audit Logs
export async function getAuditLogs(params?: { limit?: number; entityType?: string; entityId?: string }) {
  const query = new URLSearchParams()
  if (params?.limit) query.set('limit', params.limit.toString())
  if (params?.entityType) query.set('entityType', params.entityType)
  if (params?.entityId) query.set('entityId', params.entityId)
  
  return request<{
    logs: Array<{
      id: string
      action: string
      entityType: string
      entityId: string | null
      changes: any
      metadata: any
      userId: string | null
      createdAt: string
    }>
  }>(`/audit-logs?${query.toString()}`)
}

export async function listMessageTemplates() {
  return request<{ templates: Array<{ id: string; name: string; content: string; channel: string; isActive: boolean }> }>('/message-templates')
}

export async function createMessageTemplate(payload: { name: string; content: string; channel: string }) {
  return request<{ ok: true; template: { id: string; name: string; content: string } }>('/message-templates', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateMessageTemplate(id: string, payload: { name?: string; content?: string; isActive?: boolean }) {
  return request<{ ok: true }>(`/message-templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
}

export async function sendLeadMessage(leadId: string, channel: string, content: string) {
  return request<{ ok: true; message: { id: string; createdAt: string } }>(`/leads/${leadId}/send-message`, {
    method: 'POST',
    body: JSON.stringify({ channel, content })
  })
}

export async function getAssignmentConfig() {
  return request<{ config: { id: string; strategy: string; autoAssign: boolean; considerCapacity: boolean; considerScore: boolean; considerSkills: boolean; customRules: any } }>('/assignment-config')
}

export async function updateAssignmentConfig(payload: { strategy?: string; autoAssign?: boolean; considerCapacity?: boolean; considerScore?: boolean; considerSkills?: boolean; customRules?: any }) {
  return request<{ ok: true; config: any }>('/assignment-config', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
}

export async function devBootstrap(payload: {
  tenantName: string
  email: string
  password: string
  displayName: string
}) {
  return request<{ tenant: { id: string; name: string }; user: { id: string; role: Role } }>(
    '/dev/bootstrap',
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  )
}

export async function devSeed(payload: { tenantId: string; salesmanCount?: number }) {
  return request<any>('/dev/seed', { method: 'POST', body: JSON.stringify(payload) })
}

export async function listBots() {
  return request<{ bots: Bot[] }>('/bots')
}

export async function createBot(payload: {
  name: string
  department?: string
  productTag?: string
  pricingMode?: 'ROUTE' | 'STANDARD'
  isActive?: boolean
}) {
  return request<{ bot: Bot }>('/bots', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateBot(
  id: string,
  payload: Partial<Pick<Bot, 'name' | 'department' | 'productTag' | 'pricingMode' | 'isActive'>>
) {
  return request<{ ok: true }>(`/bots/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function ingestMessage(payload: {
  botId?: string
  channel: string
  externalId?: string
  fullName?: string
  phone?: string
  email?: string
  customerMessage: string
}) {
  return request<any>('/ingest/message', { method: 'POST', body: JSON.stringify(payload) })
}

export async function listSuccessDefinitions() {
  return request<{ definitions: SuccessDefinition[] }>('/success-definitions')
}

export type SuccessAnalytics = {
  ok: true
  days: number
  since: string
  eventsByType: Array<{ type: string; count: number; weight: number }>
  leadStatusCounts: Array<{ status: string; count: number }>
  leadHeatCounts: Array<{ heat: string; count: number }>
  leaderboard: Array<{ salesmanId: string; displayName: string; email: string | null; events: number; weight: number }>
}

export async function getSuccessAnalytics(days = 30) {
  return request<SuccessAnalytics>(`/analytics/success?days=${encodeURIComponent(String(days))}`)
}

export async function getDashboardStats() {
  return request<any>('/analytics/dashboard')
}

export async function getTimeSeriesAnalytics(days = 30) {
  return request<{
    ok: true;
    days: number;
    since: string;
    timeSeries: Array<{ date: string; newLeads: number; messagesIn: number; messagesOut: number; successEvents: number; successWeight: number }>;
    channelStats: Array<{ channel: string; total: number; converted: number; conversionRate: string }>;
  }>(`/analytics/time-series?days=${encodeURIComponent(String(days))}`)
}

export async function exportAnalyticsReport(type: 'leads' | 'success' | 'salesmen') {
  const response = await fetch(`${baseUrl()}/analytics/export?type=${encodeURIComponent(type)}`, {
    credentials: 'include'
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Export failed');
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function createSuccessDefinition(payload: {
  name: string
  type: SuccessEventType
  weight: number
  isActive?: boolean
}) {
  return request<{ definition: SuccessDefinition }>('/success-definitions', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateSuccessDefinition(id: string, payload: Partial<Pick<SuccessDefinition, 'name' | 'weight' | 'isActive'>>) {
  return request<{ ok: true }>(`/success-definitions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function recomputeScores() {
  return request<{ ok: true; updates: Array<{ salesmanId: string; score: number }> }>('/success/recompute', {
    method: 'POST',
    body: JSON.stringify({})
  })
}

export async function recordLeadSuccess(leadId: string, payload: { definitionId: string; note?: string }) {
  return request<{ ok: true; successEvent: any; scoreUpdates: Array<{ salesmanId: string; score: number }> }>(
    `/leads/${leadId}/success`,
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  )
}

export async function getAiConfig() {
  return request<{ config: TenantAiConfig; warning?: string }>('/ai/config')
}

export async function updateAiConfig(payload: {
  provider?: AiProvider
  openaiApiKey?: string | null
  openaiModel?: string | null
}) {
  return request<{ ok: true; config: any; warning?: string }>('/ai/config', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
}
