import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL_CACHE);

redis.on('error', (error) => {
  // TODO(sdjdd): Sentry
  console.error('[Redis] Error:', error);
});
