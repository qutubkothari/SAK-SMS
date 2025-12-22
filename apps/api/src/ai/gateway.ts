import type { LeadChannel } from '@prisma/client'
import type { AiProvider, ReplyDraft, TriageResult } from './types.js'
import { createOpenAiTriageAndReply, type OpenAiProviderConfig } from './providers/openai.js'
import { createGeminiTriageAndReply, type GeminiProviderConfig } from './providers/gemini.js'

export type AiGatewayConfig = {
  provider: AiProvider
  openai?: OpenAiProviderConfig
  gemini?: GeminiProviderConfig
}

export type TriageInput = {
  leadId: string
  channel: LeadChannel
  customerMessage: string
}

export type ReplyInput = {
  leadId: string
  channel: LeadChannel
  customerMessage: string
  // Retrieval results / product docs will be plugged in here later
  knowledgeSnippets?: Array<{ title: string; content: string }>
  pricingAllowed: boolean
}

export interface AiGateway {
  triage(input: TriageInput): Promise<TriageResult>
  draftReply(input: ReplyInput): Promise<ReplyDraft>
}

function createMockGateway(): AiGateway {
  return {
    async triage(input) {
      const text = input.customerMessage.toLowerCase()
      const isArabic = /[\u0600-\u06FF]/.test(input.customerMessage)
      const language = isArabic ? 'ar' : 'en'

      const hot = ['price', 'pricing', 'quote', 'urgent', 'today', 'asap', 'availability', 'delivery']
      const heat = hot.some((k) => text.includes(k)) ? 'HOT' : 'WARM'

      return {
        language,
        heat,
        reason: 'MOCK_TRIAGE',
        confidence: 0.55
      }
    },
    async draftReply(input) {
      const isArabic = /[\u0600-\u06FF]/.test(input.customerMessage)
      const language = isArabic ? 'ar' : 'en'

      // Pricing guardrail example
      const asksPrice = /price|pricing|discount|quote/i.test(input.customerMessage)
      if (asksPrice && !input.pricingAllowed) {
        return {
          language,
          message:
            language === 'ar'
              ? 'تم استلام استفسارك. سأقوم بتحويل طلب التسعير إلى مسؤول المبيعات للمتابعة.'
              : 'We received your enquiry. I will route the pricing request to our sales team to follow up.',
          confidence: 0.65,
          shouldEscalate: true,
          escalationReason: 'PRICING_NOT_ALLOWED'
        }
      }

      const base =
        language === 'ar'
          ? 'شكرًا لتواصلك. هل يمكنك توضيح المنتج/المواصفات المطلوبة والكمية والموقع؟'
          : 'Thanks for reaching out. Could you share the product/spec needed, quantity, and your location?'

      return {
        language,
        message: base,
        confidence: 0.6,
        shouldEscalate: false
      }
    }
  }
}

function createOpenAiGateway(config: AiGatewayConfig): AiGateway {
  const mock = createMockGateway()
  const openai = createOpenAiTriageAndReply(config.openai ?? { apiKey: process.env.OPENAI_API_KEY })

  return {
    async triage(input) {
      try {
        return await openai.triage({
          leadId: input.leadId,
          channel: input.channel,
          customerMessage: input.customerMessage
        })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('OPENAI triage failed; falling back to MOCK:', err instanceof Error ? err.message : err)
        return mock.triage(input)
      }
    },
    async draftReply(input) {
      try {
        return await openai.draftReply({
          leadId: input.leadId,
          channel: input.channel,
          customerMessage: input.customerMessage,
          pricingAllowed: input.pricingAllowed,
          knowledgeSnippets: input.knowledgeSnippets
        })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('OPENAI draftReply failed; falling back to MOCK:', err instanceof Error ? err.message : err)
        return mock.draftReply(input)
      }
    }
  }
}

function createGeminiGateway(config: AiGatewayConfig): AiGateway {
  const mock = createMockGateway()
  const gemini = createGeminiTriageAndReply(config.gemini ?? { apiKey: process.env.GEMINI_API_KEY })

  return {
    async triage(input) {
      try {
        return await gemini.triage({
          leadId: input.leadId,
          channel: input.channel,
          customerMessage: input.customerMessage
        })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('GEMINI triage failed; falling back to MOCK:', err instanceof Error ? err.message : err)
        return mock.triage(input)
      }
    },
    async draftReply(input) {
      try {
        return await gemini.draftReply({
          leadId: input.leadId,
          channel: input.channel,
          customerMessage: input.customerMessage,
          pricingAllowed: input.pricingAllowed,
          knowledgeSnippets: input.knowledgeSnippets
        })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('GEMINI draftReply failed; falling back to MOCK:', err instanceof Error ? err.message : err)
        return mock.draftReply(input)
      }
    }
  }
}

// Safe default: deterministic mock logic until real provider + eval gates are added.
export function createAiGateway(config: AiGatewayConfig): AiGateway {
  if (config.provider === 'OPENAI') return createOpenAiGateway(config)
  if (config.provider === 'GEMINI') return createGeminiGateway(config)

  return createMockGateway()
}
