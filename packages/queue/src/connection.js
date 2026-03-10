"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisConnection = getRedisConnection;
exports.closeRedisConnection = closeRedisConnection;
const ioredis_1 = require("ioredis");
const utils_1 = require("@embedo/utils");
const log = (0, utils_1.createLogger)('queue:connection');
let connection = null;
function getRedisConnection() {
    if (connection)
        return connection;
    const redisUrl = process.env['REDIS_URL'] ?? process.env['UPSTASH_REDIS_URL'];
    if (!redisUrl) {
        throw new Error('REDIS_URL or UPSTASH_REDIS_URL environment variable is required');
    }
    connection = new ioredis_1.Redis(redisUrl, {
        maxRetriesPerRequest: null, // required by BullMQ
        enableReadyCheck: false,
        lazyConnect: true,
    });
    connection.on('connect', () => log.info('Redis connected'));
    connection.on('error', (err) => log.error({ err }, 'Redis error'));
    return connection;
}
async function closeRedisConnection() {
    if (connection) {
        await connection.quit();
        connection = null;
    }
}
//# sourceMappingURL=connection.js.map