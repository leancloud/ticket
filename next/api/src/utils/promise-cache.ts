import LRU from 'lru-cache';

interface PromiseCacheOptions {
  max: number;
  ttl?: number;
}

export class PromiseCache<K, V> {
  private promiseCache: Map<K, Promise<V>>;
  private valueCache: LRU<K, V>;

  constructor(options: PromiseCacheOptions) {
    this.promiseCache = new Map();
    this.valueCache = new LRU(options);
  }

  set(key: K, promise: Promise<V>) {
    const promise_ = (async () => {
      try {
        const value = await promise;
        this.valueCache.set(key, value);
        return value;
      } finally {
        this.promiseCache.delete(key);
      }
    })();
    this.promiseCache.set(key, promise_);
    return this;
  }

  get(key: K) {
    if (this.promiseCache.has(key)) {
      return this.promiseCache.get(key);
    }
    if (this.valueCache.has(key)) {
      return Promise.resolve(this.valueCache.get(key)!);
    }
  }

  has(key: K) {
    return this.promiseCache.has(key) || this.valueCache.has(key);
  }

  delete(key: K) {
    const v1 = this.promiseCache.delete(key);
    const v2 = this.valueCache.delete(key);
    return v1 || v2;
  }

  clear() {
    this.promiseCache.clear();
    this.valueCache.clear();
  }
}
