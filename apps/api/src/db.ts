import { PrismaClient } from '@prisma/client';

let client: PrismaClient | null = null;

function getClient(): PrismaClient {
	if (client) return client;

	try {
		client = new PrismaClient();
		return client;
	} catch (err) {
		const hint =
			'Prisma failed to initialize. Common causes on Windows: Docker/Postgres not running, missing DATABASE_URL, or Prisma engine DLL locked by another node process.';
		const msg = err instanceof Error ? err.message : String(err);
		throw new Error(`${hint}\n\n${msg}`);
	}
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
	get(_target, prop) {
		const c = getClient() as any;
		return c[prop];
	}
});
