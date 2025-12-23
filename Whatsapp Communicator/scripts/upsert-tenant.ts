import 'dotenv/config';
import { z } from 'zod';
import { prisma } from '../src/db.js';

const envSchema = z.object({
  TENANT_NAME: z.string().min(1).default('primary'),
  TENANT_SESSION_ID: z.string().min(4),
  TENANT_API_KEY_MODE: z.enum(['session', 'user']).default('session'),
  TENANT_API_KEY: z.string().min(10),
  TENANT_WEBHOOK_SECRET: z.string().min(10),
  TENANT_PHONE_NUMBER: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Missing/invalid env for tenant upsert:\n${message}`);
  }
  return parsed.data;
}

async function main() {
  const env = loadEnv();

  const tenant = await prisma.tenant.upsert({
    where: { sessionId: env.TENANT_SESSION_ID },
    update: {
      name: env.TENANT_NAME,
      apiKeyMode: env.TENANT_API_KEY_MODE,
      apiKey: env.TENANT_API_KEY,
      webhookSecret: env.TENANT_WEBHOOK_SECRET,
      phoneNumber: env.TENANT_PHONE_NUMBER ?? null,
      isActive: true,
    },
    create: {
      name: env.TENANT_NAME,
      sessionId: env.TENANT_SESSION_ID,
      apiKeyMode: env.TENANT_API_KEY_MODE,
      apiKey: env.TENANT_API_KEY,
      webhookSecret: env.TENANT_WEBHOOK_SECRET,
      phoneNumber: env.TENANT_PHONE_NUMBER ?? null,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      sessionId: true,
      apiKeyMode: true,
      phoneNumber: true,
      isActive: true,
      updatedAt: true,
    },
  });

  // Intentionally do not print apiKey/webhookSecret.
  // eslint-disable-next-line no-console
  console.log('Tenant upserted:', tenant);
}

await main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
