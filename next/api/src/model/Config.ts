import LRU from 'lru-cache';

import { Model, field } from '@/orm';

const configCache = new LRU<string, any>({
  max: 100,
  ttl: 1000 * 60 * 10,
});

interface GetConfigOptions {
  cache?: boolean;
}

export class Config extends Model {
  @field()
  key!: string;

  @field()
  value!: unknown;

  private static findOneByKey(key: string) {
    return this.queryBuilder().where('key', '==', key).first({ useMasterKey: true });
  }

  static async get<T = any>(key: string, options: GetConfigOptions = {}): Promise<T | undefined> {
    const { cache = true } = options;
    if (cache) {
      const cacheValue = configCache.get(key);
      if (cacheValue) {
        return cacheValue;
      }
    }
    const config = await this.findOneByKey(key);
    if (config) {
      configCache.set(key, config.value);
      return config.value as T;
    }
  }

  static async set(key: string, value: any): Promise<Config> {
    const config = await this.findOneByKey(key);
    const newConfig = config
      ? await config.update({ value }, { useMasterKey: true })
      : await Config.create({ ACL: {}, key, value }, { useMasterKey: true });
    configCache.delete(key);
    return newConfig;
  }

  static async remove(key: string) {
    const config = await this.findOneByKey(key);
    if (config) {
      await config.delete({ useMasterKey: true });
    }
    configCache.delete(key);
  }
}
