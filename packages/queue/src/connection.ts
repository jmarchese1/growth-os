import IORedis from 'ioredis';
import { createLogger } from '@embedo/utils';

const log = createLogger('queue:connection');

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (connection) return connection;

  const redisUrl = process.env['REDIS_URL'] ?? process.env['UPSTASH_REDIS_URL'];

  if (!redisUrl) {
    throw new Error('REDIS_URL or UPSTASH_REDIS_URL environment variable is required');
  }

  connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
  });

  connection.on('connect', () => log.info('Redis connected'));
  connection.on('error', (err) => log.error({ err }, 'Redis error'));

  return connection;
}

export async function closeRedisConnection(): Promise<void> {
  if (connection) {
    await connection.quit();
    connection = null;
  }
}
