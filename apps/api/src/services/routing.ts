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

// Pick salesman based on assignment configuration
export async function pickSalesmanWithConfig(
  prisma: PrismaClient,
  tenantId: string,
  opts?: { seed?: string }
) {
  // Get assignment config
  const config = await prisma.assignmentConfig.findUnique({
    where: { tenantId }
  });

  if (!config || !config.autoAssign) {
    return null; // Manual assignment required
  }

  const strategy = config.strategy;

  switch (strategy) {
    case 'ROUND_ROBIN':
      return pickSalesmanRoundRobinInternal(prisma, tenantId, config, opts);
    case 'LEAST_ACTIVE':
      return pickSalesmanLeastActive(prisma, tenantId, config, opts);
    case 'SKILLS_BASED':
    case 'GEOGRAPHIC':
    case 'CUSTOM':
      // For now, fall back to weighted logic
      return pickSalesmanRoundRobinInternal(prisma, tenantId, config, opts);
    default:
      return pickSalesmanRoundRobinInternal(prisma, tenantId, config, opts);
  }
}

// Round-robin with optional capacity and score consideration
async function pickSalesmanRoundRobinInternal(
  prisma: PrismaClient,
  tenantId: string,
  config: any,
  opts?: { seed?: string }
) {
  const salesmen = await prisma.salesman.findMany({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: 'asc' },
    take: 200
  });

  if (salesmen.length === 0) return null;

  // Compute active load per salesman
  const loadRows = await prisma.lead.groupBy({
    by: ['assignedToSalesmanId'],
    where: {
      tenantId,
      assignedToSalesmanId: { not: null },
      status: { notIn: ['WON', 'LOST'] }
    },
    _count: { _all: true }
  });

  const loadBySalesmanId = new Map<string, number>();
  for (const row of loadRows) {
    if (!row.assignedToSalesmanId) continue;
    loadBySalesmanId.set(row.assignedToSalesmanId, row._count._all);
  }

  const seed = opts?.seed ?? '';
  let best: (typeof salesmen)[number] | null = null;
  let bestWeight = -Infinity;

  for (const s of salesmen) {
    const load = loadBySalesmanId.get(s.id) ?? 0;

    // Check capacity if enabled
    if (config.considerCapacity && s.capacity > 0 && load >= s.capacity) {
      continue;
    }

    const scoreNorm = config.considerScore ? Math.max(0, Math.min(1, s.score / 100)) : 0.5;
    const loadNorm = 1 / (1 + load);
    const capNorm = s.capacity > 0 ? Math.max(0, Math.min(1, 1 - load / s.capacity)) : 0.5;

    // Weighted blend
    const baseWeight = (config.considerScore ? 0.65 : 0.35) * scoreNorm + 0.3 * loadNorm + 0.05 * capNorm;
    const jitter = (stableHash(`${seed}:${s.id}`) % 1000) / 1_000_000;
    const weight = baseWeight + jitter;

    if (weight > bestWeight) {
      bestWeight = weight;
      best = s;
    }
  }

  return best;
}

// Least active strategy - assign to salesman with fewest active leads
async function pickSalesmanLeastActive(
  prisma: PrismaClient,
  tenantId: string,
  config: any,
  opts?: { seed?: string }
) {
  const salesmen = await prisma.salesman.findMany({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: 'asc' },
    take: 200
  });

  if (salesmen.length === 0) return null;

  // Compute active load per salesman
  const loadRows = await prisma.lead.groupBy({
    by: ['assignedToSalesmanId'],
    where: {
      tenantId,
      assignedToSalesmanId: { not: null },
      status: { notIn: ['WON', 'LOST'] }
    },
    _count: { _all: true }
  });

  const loadBySalesmanId = new Map<string, number>();
  for (const row of loadRows) {
    if (!row.assignedToSalesmanId) continue;
    loadBySalesmanId.set(row.assignedToSalesmanId, row._count._all);
  }

  const seed = opts?.seed ?? '';
  let best: (typeof salesmen)[number] | null = null;
  let leastLoad = Infinity;

  for (const s of salesmen) {
    const load = loadBySalesmanId.get(s.id) ?? 0;

    // Check capacity if enabled
    if (config.considerCapacity && s.capacity > 0 && load >= s.capacity) {
      continue;
    }

    // Find salesman with least load
    if (load < leastLoad) {
      leastLoad = load;
      best = s;
    } else if (load === leastLoad && best) {
      // Tie-break with hash
      const hash1 = stableHash(`${seed}:${s.id}`);
      const hash2 = stableHash(`${seed}:${best.id}`);
      if (hash1 > hash2) {
        best = s;
      }
    }
  }

  return best;
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

// Backwards-compatible name used by routes; now uses config
export async function pickSalesmanRoundRobin(prisma: PrismaClient, tenantId: string, seed?: string) {
  // First try config-based picker
  const withConfig = await pickSalesmanWithConfig(prisma, tenantId, { seed });
  if (withConfig) return withConfig;
  
  // Fall back to weighted picker
  return pickSalesmanWeighted(prisma, tenantId, { seed })
}
