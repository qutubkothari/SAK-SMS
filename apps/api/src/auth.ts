import type { Request } from 'express';
import bcrypt from 'bcryptjs';

export type AuthContext = {
  tenantId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALESMAN';
};

export function getTenantId(req: Request): string {
  const tenantId = req.header('x-tenant-id');
  if (!tenantId) throw new Error('Missing x-tenant-id');
  return tenantId;
}

// Dev-only auth: uses headers until JWT is wired.
export function getAuthContext(req: Request): AuthContext {
  const tenantId = getTenantId(req);
  const userId = req.header('x-user-id');
  const role = req.header('x-role') as AuthContext['role'] | undefined;
  if (!userId || !role) throw new Error('Missing x-user-id or x-role');
  return { tenantId, userId, role };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
