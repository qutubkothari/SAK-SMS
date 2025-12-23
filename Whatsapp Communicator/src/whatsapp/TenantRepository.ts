import type { PrismaClient, SakApiKeyMode, Tenant } from '@prisma/client';

export type TenantCreateInput = {
  name: string;
  sessionId: string;
  apiKeyMode: SakApiKeyMode;
  apiKey: string;
  webhookSecret: string;
  phoneNumber?: string | null;
};

export class TenantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  getBySessionId(sessionId: string): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({ where: { sessionId } });
  }

  list(): Promise<Tenant[]> {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(input: TenantCreateInput): Promise<Tenant> {
    return this.prisma.tenant.create({
      data: {
        name: input.name,
        sessionId: input.sessionId,
        apiKeyMode: input.apiKeyMode,
        apiKey: input.apiKey,
        webhookSecret: input.webhookSecret,
        phoneNumber: input.phoneNumber ?? null,
      },
    });
  }

  setActive(sessionId: string, isActive: boolean): Promise<Tenant> {
    return this.prisma.tenant.update({ where: { sessionId }, data: { isActive } });
  }
}
