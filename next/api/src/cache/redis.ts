import Redis from 'ioredis';
import { Fetcher } from './types';

export const redis = new Redis(process.env.REDIS_URL_CACHE);

redis.on('error', (error) => {
  // TODO(sdjdd): Sentry
  console.error('[Redis] Error:', error);
});

export class RedisCache<T> {
  constructor(
    private namespace: string,
    private fetcher: Fetcher<T>,
    private serialize: (source: T) => string,
    private deserialize: (source: string) => T,
    private defaultTTL = 3600
  ) {}

  async get(id: string, ttl = this.defaultTTL): Promise<T> {
    const key = `${this.namespace}:${id}`;
    const cachedValue = await redis.get(key);
    if (cachedValue) {
      return this.deserialize(cachedValue);
    }
    const freshItem = await this.fetcher(id);
    await redis.set(key, this.serialize(freshItem), 'ex', ttl);
    return freshItem;
  }
}
