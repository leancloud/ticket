import { CacheStore, MultipleSetItem } from './types';

type ObjectCacheKey = Record<string, string | number | boolean | null | undefined>;

export type CacheKey = string | ObjectCacheKey;

export class Cache {
  constructor(private stores: [CacheStore, ...CacheStore[]]) {
    if (stores.length === 0) {
      throw new Error('No stores provided');
    }
  }

  async set(key: CacheKey, value: any) {
    const stringKey = this.encodeCacheKey(key);
    for (const store of this.stores) {
      await store.set(stringKey, value);
    }
  }

  async mset(items: MultipleSetItem<CacheKey, any>[]) {
    const encodedItems = items.map((item) => {
      return {
        ...item,
        key: this.encodeCacheKey(item.key),
      };
    });
    for (const store of this.stores) {
      await store.mset(encodedItems);
    }
  }

  get<V = any>(key: CacheKey): Promise<V | undefined> {
    const stringKey = this.encodeCacheKey(key);
    return this.getFrom(1, stringKey);
  }

  async mget<V = any>(keys: CacheKey[]): Promise<(V | undefined)[]> {
    const stringKeys = keys.map((key) => this.encodeCacheKey(key));
    const values = await this.mgetFrom(1, stringKeys);
    return stringKeys.map((key) => values[key]);
  }

  async del(key: CacheKey | CacheKey[]) {
    const stringKey = Array.isArray(key)
      ? key.map((k) => this.encodeCacheKey(k))
      : this.encodeCacheKey(key);
    for (const store of this.stores) {
      await store.del(stringKey);
    }
  }

  private async getFrom(level: number, key: string): Promise<any> {
    if (level > this.stores.length) {
      return;
    }

    const store = this.stores[level - 1];
    const value = await store.get(key);
    if (value !== undefined) {
      return value;
    }

    const baseValue = await this.getFrom(level + 1, key);
    if (baseValue !== undefined) {
      await store.set(key, baseValue);
    }

    return baseValue;
  }

  private async mgetFrom(level: number, keys: string[]) {
    if (level > this.stores.length) {
      return {};
    }

    const store = this.stores[level - 1];
    const values = await store.mget(keys);

    const missedKeys = keys.reduce<string[]>((keys, key) => {
      if (!(key in values)) {
        keys.push(key);
      }
      return keys;
    }, []);

    if (missedKeys.length) {
      const baseValues = await this.mgetFrom(level + 1, missedKeys);
      const items = missedKeys.reduce<MultipleSetItem<string, string>[]>((items, key) => {
        const value = baseValues[key];
        if (value !== undefined) {
          items.push({ key, value });
        }
        return items;
      }, []);
      if (items.length) {
        await store.mset(items);
      }
      Object.assign(values, baseValues);
    }

    return values;
  }

  private encodeCacheKey(key: CacheKey) {
    if (typeof key === 'string') {
      return key;
    }
    return Object.entries(key)
      .filter(([, value]) => value !== undefined && value !== null)
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .map(([key, value]) => `${key}:${value}`)
      .join(':');
  }
}
