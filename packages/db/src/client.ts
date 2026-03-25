import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// In production, limit Prisma connection pool to avoid exhausting Supabase pooler.
// Append connection_limit if not already present in DATABASE_URL.
function buildDatasourceUrl(): string {
  const url = process.env['DATABASE_URL'] ?? '';
  if (!url || process.env['NODE_ENV'] !== 'production') return url;
  if (url.includes('connection_limit')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}connection_limit=5`;
}

const datasourceUrl = buildDatasourceUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
    ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = db;
}
