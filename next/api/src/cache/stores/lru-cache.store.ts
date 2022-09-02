import LRUCache from 'lru-cache';
import { CacheStore, MultipleSetItem } from '../types';

export class LRUCacheStore implements CacheStore {
  private lruCache: LRUCache<string, any>;

  constructor(options: LRUCache.Options<string, any>) {
    this.lruCache = new LRUCache(options);
  }

  set(key: string, value: any, ttl?: number) {
    this.lruCache.set(key, value, { ttl });
  }

  mset(items: MultipleSetItem<string, any>[]) {
    items.forEach((item) => {
      this.lruCache.set(item.key, item.value, {
        ttl: item.ttl,
      });
    });
  }

  get(key: string) {
    return this.lruCache.get(key);
  }

  mget(keys: string[]) {
    return keys.reduce<Record<string, any>>((values, key) => {
      const value = this.lruCache.get(key);
      if (value !== undefined) {
        values[key] = value;
      }
      return values;
    }, {});
  }

  del(key: string | string[]) {
    if (typeof key === 'string') {
      this.lruCache.delete(key);
    } else {
      key.forEach((key) => this.lruCache.delete(key));
    }
  }
}
