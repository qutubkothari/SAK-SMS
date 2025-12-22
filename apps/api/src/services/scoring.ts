import type { PrismaClient } from '@prisma/client'

export type ScoreUpdate = {
  salesmanId: string
  score: number
}

export async function recomputeSalesmanScores(
  prisma: PrismaClient,
  tenantId: string,
  opts?: { lookbackDays?: number }
): Promise<ScoreUpdate[]> {
  const lookbackDays = opts?.lookbackDays ?? 30
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)

  const salesmen = await prisma.salesman.findMany({
    where: { tenantId },
    select: { id: true }
  })
  if (salesmen.length === 0) return []

  const rows = await prisma.successEvent.groupBy({
    by: ['salesmanId'],
    where: { tenantId, createdAt: { gte: since }, salesmanId: { not: null } },
    _sum: { weight: true }
  })

  const pointsBySalesmanId = new Map<string, number>()
  for (const r of rows) {
    if (!r.salesmanId) continue
    pointsBySalesmanId.set(r.salesmanId, r._sum.weight ?? 0)
  }

  let maxPoints = 0
  for (const s of salesmen) {
    const pts = pointsBySalesmanId.get(s.id) ?? 0
    if (pts > maxPoints) maxPoints = pts
  }

  const updates: ScoreUpdate[] = []
  for (const s of salesmen) {
    const pts = pointsBySalesmanId.get(s.id) ?? 0
    const score = maxPoints > 0 ? Math.round((pts / maxPoints) * 100) : 0
    updates.push({ salesmanId: s.id, score })
  }

  // Persist scores.
  await Promise.all(
    updates.map((u) =>
      prisma.salesman.updateMany({
        where: { id: u.salesmanId, tenantId },
        data: { score: u.score }
      })
    )
  )

  return updates
}
