import { Fetcher } from './types';

export class LocalCache<T> {
  private data: Record<string, T> = {};
  private fetchTask: Record<string, Promise<T>> = {};

  /**
   * @param ttl 和 redis 保持一致, 单位是秒!
   * @param fetcher
   */
  constructor(readonly defaultTtl: number, private fetcher: Fetcher<T>) {}

  async get(id: string, ttl = this.defaultTtl): Promise<T> {
    if (this.data[id]) {
      return this.data[id];
    }
    if (!this.fetchTask[id]) {
      this.fetchTask[id] = (async () => {
        try {
          this.data[id] = await this.fetcher(id);
          if (ttl > 0) {
            setTimeout(() => delete this.data[id], ttl * 1000);
          }
          return this.data[id];
        } finally {
          delete this.fetchTask[id];
        }
      })();
    }
    return this.fetchTask[id];
  }
}
