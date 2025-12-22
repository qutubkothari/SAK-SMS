export type AiProvider = 'OPENAI' | 'GEMINI' | 'MOCK'

export type Language = 'en' | 'ar'

export type LeadHeat = 'COLD' | 'WARM' | 'HOT' | 'VERY_HOT' | 'ON_FIRE'

export type TriageResult = {
  language: Language
  heat: LeadHeat
  reason: string
  productTag?: string
  department?: string
  confidence: number // 0..1
}

export type ReplyDraft = {
  language: Language
  message: string
  confidence: number // 0..1
  shouldEscalate: boolean
  escalationReason?: string
}
