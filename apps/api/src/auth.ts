import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { HttpError } from './http.js';

export type AuthContext = {
  tenantId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALESMAN';
};

type AuthTokenPayload = AuthContext;

const AUTH_COOKIE_NAME = 'sak_auth';

export function getTenantId(req: Request): string {
  const tenantId = req.header('x-tenant-id');
  if (!tenantId) throw new Error('Missing x-tenant-id');
  return tenantId;
}

export function getTenantIdOptional(req: Request): string | null {
  const tenantId = req.header('x-tenant-id');
  if (!tenantId) return null;
  return tenantId;
}

function getJwtSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    // Keep dev usable without env config, but strongly encourage setting a secret.
    if (process.env.NODE_ENV === 'production') throw new Error('Missing AUTH_JWT_SECRET');
    return 'dev-insecure-secret';
  }
  return secret;
}

function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;

  // Minimal cookie parser (avoid extra middleware). Format: a=b; c=d
  for (const part of cookieHeader.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join('='));
  }
  return out;
}

function getBearerToken(req: Request): string | null {
  const auth = req.header('authorization');
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

function getAuthTokenFromRequest(req: Request): string | null {
  const bearer = getBearerToken(req);
  if (bearer) return bearer;

  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[AUTH_COOKIE_NAME] ?? null;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  const secret = getJwtSecret();
  const expiresIn = (process.env.AUTH_JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'];
  const options: jwt.SignOptions = {
    expiresIn
  };
  return jwt.sign(payload, secret as jwt.Secret, options);
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const secret = getJwtSecret();
  const decoded = jwt.verify(token, secret as jwt.Secret);
  if (typeof decoded !== 'object' || decoded === null) throw new Error('Invalid token');

  const { tenantId, userId, role } = decoded as Partial<AuthTokenPayload>;
  if (!tenantId || !userId || !role) throw new Error('Invalid token');
  return { tenantId, userId, role } as AuthTokenPayload;
}

function shouldAllowDevHeaders(): boolean {
  if (process.env.AUTH_ALLOW_DEV_HEADERS === 'false') return false;
  if (process.env.AUTH_ALLOW_DEV_HEADERS === 'true') return true;
  if (process.env.AUTH_MODE === 'DEV_HEADERS') return true;
  return process.env.NODE_ENV !== 'production';
}

export function setAuthCookie(res: Response, token: string) {
  const secure = process.env.AUTH_COOKIE_SECURE === 'true';
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/'
  });
}

export function clearAuthCookie(res: Response) {
  const secure = process.env.AUTH_COOKIE_SECURE === 'true';
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/'
  });
}

export function getAuthContext(req: Request): AuthContext {
  const token = getAuthTokenFromRequest(req);
  if (token) {
    try {
      const ctx = verifyAuthToken(token);
      // Header tenantId (if present) must match token tenantId.
      const headerTenantId = getTenantIdOptional(req);
      if (headerTenantId && headerTenantId !== ctx.tenantId) throw new HttpError(401, 'Unauthorized');
      return ctx;
    } catch {
      throw new HttpError(401, 'Unauthorized');
    }
  }

  if (shouldAllowDevHeaders()) {
    const tenantId = getTenantId(req);
    const userId = req.header('x-user-id');
    const role = req.header('x-role') as AuthContext['role'] | undefined;
    if (!userId || !role) throw new Error('Missing x-user-id or x-role');
    return { tenantId, userId, role };
  }

  throw new HttpError(401, 'Unauthorized');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
