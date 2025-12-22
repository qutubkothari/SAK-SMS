import { z } from 'zod'
import type { ReplyDraft, TriageResult } from '../types.js'

export type OpenAiProviderConfig = {
  apiKey?: string
  model?: string
  baseUrl?: string
}

function extractFirstJsonObject(text: string): unknown {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return JSON.parse(trimmed)
  }

  const first = trimmed.indexOf('{')
  const last = trimmed.lastIndexOf('}')
  if (first >= 0 && last > first) {
    return JSON.parse(trimmed.slice(first, last + 1))
  }

  throw new Error('AI provider did not return JSON')
}

function pickResponseText(data: any): string {
  if (typeof data?.output_text === 'string') return data.output_text

  // Responses API format
  const output = Array.isArray(data?.output) ? data.output : []
  const chunks: string[] = []
  for (const o of output) {
    const content = Array.isArray(o?.content) ? o.content : []
    for (const c of content) {
      if (typeof c?.text === 'string') chunks.push(c.text)
      if (typeof c?.type === 'string' && c.type === 'output_text' && typeof c?.text === 'string') chunks.push(c.text)
    }
  }
  return chunks.join('\n').trim()
}

async function callOpenAIJson(opts: {
  apiKey: string
  model: string
  system: string
  user: string
}): Promise<unknown> {
  const baseUrl = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/+$/, '')
  const res = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${opts.apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: opts.model,
      input: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user }
      ],
      temperature: 0.2,
      max_output_tokens: 500
    })
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = typeof data?.error?.message === 'string' ? data.error.message : `OpenAI error (${res.status})`
    throw new Error(msg)
  }

  const text = pickResponseText(data)
  return extractFirstJsonObject(text)
}

const triageSchema = z.object({
  language: z.enum(['en', 'ar']),
  heat: z.enum(['COLD', 'WARM', 'HOT', 'VERY_HOT', 'ON_FIRE']),
  reason: z.string().min(1),
  productTag: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  confidence: z.number().min(0).max(1)
})

const replySchema = z.object({
  language: z.enum(['en', 'ar']),
  message: z.string().min(1),
  confidence: z.number().min(0).max(1),
  shouldEscalate: z.boolean(),
  escalationReason: z.string().min(1).optional()
})

function detectArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text)
}

function customerAsksPricing(message: string): boolean {
  return /price|pricing|discount|quote|quotation|rate|cost/i.test(message)
}

export function createOpenAiTriageAndReply(config: OpenAiProviderConfig) {
  const apiKey = config.apiKey
  const model = config.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

  return {
    async triage(input: { leadId: string; channel: string; customerMessage: string }): Promise<TriageResult> {
      if (!apiKey) throw new Error('OPENAI_API_KEY not set')

      const system =
        'You are a lead-triage classifier for a CRM. Return ONLY valid JSON that matches this schema: ' +
        '{"language":"en|ar","heat":"COLD|WARM|HOT|VERY_HOT|ON_FIRE","reason":"string","productTag?":"string","department?":"string","confidence":0..1}. '

      const user =
        `LeadId: ${input.leadId}\n` +
        `Channel: ${input.channel}\n` +
        `Customer message: ${input.customerMessage}\n\n` +
        'Heuristics:\n' +
        '- language: detect Arabic vs English.\n' +
        '- heat: HOT+ if urgent/asap/delivery/availability/price request; else WARM; COLD only for very generic greeting.\n' +
        '- confidence: 0..1 (be honest).\n'

      const raw = await callOpenAIJson({ apiKey, model, system, user })
      const parsed = triageSchema.parse(raw)
      return parsed
    },

    async draftReply(input: {
      leadId: string
      channel: string
      customerMessage: string
      pricingAllowed: boolean
      knowledgeSnippets?: Array<{ title: string; content: string }>
    }): Promise<ReplyDraft> {
      if (!apiKey) throw new Error('OPENAI_API_KEY not set')

      const isArabic = detectArabic(input.customerMessage)
      const expectedLang = isArabic ? 'ar' : 'en'

      const system =
        'You are a sales assistant that drafts short, helpful replies. Return ONLY valid JSON that matches this schema: ' +
        '{"language":"en|ar","message":"string","confidence":0..1,"shouldEscalate":true|false,"escalationReason?":"string"}. ' +
        'Rules: If the customer asks for pricing and pricingAllowed=false, must set shouldEscalate=true and escalationReason="PRICING_NOT_ALLOWED". ' +
        'If you are uncertain (confidence < 0.6) or missing essential details, set shouldEscalate=true and escalationReason="LOW_CONFIDENCE". '

      const snippets = (input.knowledgeSnippets ?? [])
        .slice(0, 5)
        .map((s, i) => `#${i + 1} ${s.title}\n${s.content}`)
        .join('\n\n')

      const user =
        `LeadId: ${input.leadId}\n` +
        `Channel: ${input.channel}\n` +
        `pricingAllowed: ${String(input.pricingAllowed)}\n` +
        `Prefer language: ${expectedLang}\n` +
        `Customer message: ${input.customerMessage}\n\n` +
        (snippets ? `Knowledge snippets (may be used):\n${snippets}\n\n` : '') +
        'Reply style: human-like, concise, no emojis, ask 1-2 clarifying questions if needed.'

      const raw = await callOpenAIJson({ apiKey, model, system, user })
      const parsed = replySchema.parse(raw)

      // Hard guardrail enforcement (server-side): pricing not allowed => escalate.
      const asksPrice = customerAsksPricing(input.customerMessage)
      if (asksPrice && !input.pricingAllowed) {
        return {
          language: parsed.language,
          message:
            parsed.language === 'ar'
              ? 'تم استلام استفسارك. سأقوم بتحويل طلب التسعير إلى مسؤول المبيعات للمتابعة.'
              : 'We received your enquiry. I will route the pricing request to our sales team to follow up.',
          confidence: Math.max(parsed.confidence, 0.6),
          shouldEscalate: true,
          escalationReason: 'PRICING_NOT_ALLOWED'
        }
      }

      return parsed
    }
  }
}
