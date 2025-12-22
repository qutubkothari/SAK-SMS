export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALESMAN'

export type DevAuth = {
  tenantId: string
  userId: string
  role: Role
}

const STORAGE_KEY = 'sak.devAuth'

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
  const auth = loadDevAuth()
  const headers = new Headers(init?.headers)

  if (auth.tenantId) headers.set('x-tenant-id', auth.tenantId)
  if (auth.userId) headers.set('x-user-id', auth.userId)
  if (auth.role) headers.set('x-role', auth.role)

  if (!headers.has('content-type')) headers.set('content-type', 'application/json')

  const res = await fetch(`${baseUrl()}${path}`, { ...init, headers })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message = (data as any)?.error ?? `HTTP ${res.status}`
    throw new Error(message)
  }

  return data as T
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

export async function getLead(id: string) {
  return request<{ lead: any }>(`/leads/${id}`)
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

export async function updateSalesman(id: string, payload: Partial<Pick<Salesman, 'score' | 'capacity' | 'isActive'>>) {
  return request<{ ok: true }>(`/salesmen/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function assignLead(id: string, salesmanId: string | null) {
  return request<{ ok: true }>(`/leads/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ salesmanId })
  })
}

export async function listTriage() {
  return request<{ items: TriageItem[] }>('/triage')
}

export async function assignTriageItem(triageId: string, salesmanId: string) {
  return request<{ ok: true }>(`/triage/${triageId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ salesmanId })
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
