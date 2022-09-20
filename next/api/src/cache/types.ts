export interface MultipleSetItem<K, V> {
  key: K;
  value: V;
  ttl?: number;
}

export interface CacheStore {
  set: (key: string, value: any, ttl?: number) => void | Promise<void>;
  mset: (items: MultipleSetItem<string, any>[]) => void | Promise<void>;
  get: (key: string) => any | Promise<any>;
  mget: (keys: string[]) => Record<string, any> | Promise<Record<string, any>>;
  del: (key: string | string[]) => void | Promise<void>;
}
