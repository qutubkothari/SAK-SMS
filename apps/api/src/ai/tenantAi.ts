import type { PrismaClient } from '@prisma/client'
import { createAiGateway } from './gateway.js'

export async function createAiGatewayForTenant(prisma: PrismaClient, tenantId: string) {
  // Safe defaults from env.
  const envProvider = (process.env.AI_PROVIDER ?? 'MOCK') as any
  const envOpenAi = {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL,
    baseUrl: process.env.OPENAI_BASE_URL
  }

  try {
    const cfg = await prisma.tenantAiConfig.findUnique({ where: { tenantId } })

    if (!cfg) {
      return createAiGateway({ provider: envProvider, openai: envOpenAi })
    }

    return createAiGateway({
      provider: cfg.provider as any,
      openai: {
        apiKey: cfg.openaiApiKey ?? envOpenAi.apiKey,
        model: cfg.openaiModel ?? envOpenAi.model,
        baseUrl: envOpenAi.baseUrl
      }
    })
  } catch (err) {
    // If migrations haven't been applied yet, Prisma will throw because the table doesn't exist.
    // In that case, fall back to env-based behavior.
    // eslint-disable-next-line no-console
    console.warn('Tenant AI config unavailable; using env defaults:', err instanceof Error ? err.message : err)
    return createAiGateway({ provider: envProvider, openai: envOpenAi })
  }
}
