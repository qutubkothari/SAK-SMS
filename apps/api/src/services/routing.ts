import type { PrismaClient } from '@prisma/client'

function stableHash(input: string): number {
  // Small deterministic hash for tie-breaking; not crypto.
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export async function pickSalesmanWeighted(
  prisma: PrismaClient,
  tenantId: string,
  opts?: { seed?: string }
) {
  const salesmen = await prisma.salesman.findMany({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: 'asc' },
    take: 200
  })

  if (salesmen.length === 0) return null

  // Compute active load per salesman (assigned leads that aren't closed).
  const loadRows = await prisma.lead.groupBy({
    by: ['assignedToSalesmanId'],
    where: {
      tenantId,
      assignedToSalesmanId: { not: null },
      status: { notIn: ['WON', 'LOST'] }
    },
    _count: { _all: true }
  })

  const loadBySalesmanId = new Map<string, number>()
  for (const row of loadRows) {
    if (!row.assignedToSalesmanId) continue
    loadBySalesmanId.set(row.assignedToSalesmanId, row._count._all)
  }

  const seed = opts?.seed ?? ''
  let best: (typeof salesmen)[number] | null = null
  let bestWeight = -Infinity

  for (const s of salesmen) {
    const load = loadBySalesmanId.get(s.id) ?? 0

    // If capacity is set (>0), treat it as a hard cap.
    if (s.capacity > 0 && load >= s.capacity) continue

    const scoreNorm = Math.max(0, Math.min(1, s.score / 100))
    const loadNorm = 1 / (1 + load) // 1.0, 0.5, 0.33...
    const capNorm = s.capacity > 0 ? Math.max(0, Math.min(1, 1 - load / s.capacity)) : 0.5

    // Weighted blend: prefer high score, then low load, then capacity headroom.
    const baseWeight = 0.65 * scoreNorm + 0.3 * loadNorm + 0.05 * capNorm
    const jitter = (stableHash(`${seed}:${s.id}`) % 1000) / 1_000_000
    const weight = baseWeight + jitter

    if (weight > bestWeight) {
      bestWeight = weight
      best = s
    }
  }

  return best
}

// Backwards-compatible name used by routes; now points to the weighted picker.
export async function pickSalesmanRoundRobin(prisma: PrismaClient, tenantId: string, seed?: string) {
  return pickSalesmanWeighted(prisma, tenantId, { seed })
}
