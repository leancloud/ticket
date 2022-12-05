import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL_CACHE);

redis.on('error', (error) => {
  // TODO(sdjdd): Sentry
  console.error('[Redis] Error:', error);
});

export type Fetcher<T> = (id: string) => Promise<T>;

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

  async del(id: string) {
    const key = `${this.namespace}:${id}`;
    const cachedValue = await redis.getdel(key);
    return cachedValue !== null ? this.deserialize(cachedValue) : cachedValue;
  }
}
