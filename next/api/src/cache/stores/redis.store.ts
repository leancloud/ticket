import { CacheStore, MultipleSetItem } from '../types';
import { redis } from '../redis';

interface RedisStoreOptions {
  prefix: string;
  ttl?: number;
  encode?: (value: any) => any;
  decode?: (value: any) => any;
}

export class RedisStore implements CacheStore {
  private prefix: string;

  private ttl?: number;

  private encode: (value: any) => any;

  private decode: (value: any) => any;

  constructor(options: RedisStoreOptions) {
    this.prefix = options.prefix;
    this.ttl = options.ttl;
    this.encode = options.encode ?? JSON.stringify;
    this.decode = options.decode ?? JSON.parse;
  }

  async set(key: string, value: any, ttl = this.ttl) {
    key = this.encodeKey(key);
    value = this.encode(value);
    if (ttl) {
      await redis.set(key, value, 'EX', ttl);
    } else {
      await redis.set(key, value);
    }
  }

  async mset(items: MultipleSetItem<string, string>[]) {
    const p = redis.pipeline();
    items.forEach((item) => {
      const key = this.encodeKey(item.key);
      const value = this.encode(item.value);
      const ttl = item.ttl ?? this.ttl;
      if (ttl) {
        p.set(key, value, 'EX', ttl);
      } else {
        p.set(key, value);
      }
    });
    await p.exec();
  }

  async get(key: string) {
    const value = await redis.get(this.encodeKey(key));
    if (value !== null) {
      return this.decode(value);
    }
  }

  async mget(keys: string[]) {
    const values = await redis.mget(keys.map((key) => this.encodeKey(key)));
    return values.reduce<Record<string, string>>((map, value, i) => {
      if (value !== null) {
        map[keys[i]] = this.decode(value);
      }
      return map;
    }, {});
  }

  async del(key: string | string[]) {
    key = typeof key === 'string' ? this.encodeKey(key) : key.map((k) => this.encodeKey(k));
    await redis.del(key);
  }

  private encodeKey(key: string) {
    if (key) {
      return `${this.prefix}:${key}`;
    }
    return this.prefix;
  }
}
