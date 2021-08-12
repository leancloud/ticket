export type Fetcher<T> = () => Promise<T>;

export class LocalCache<T> {
  private data?: T;
  private fetchTask?: Promise<T>;

  /**
   * @param ttl 和 redis 保持一致, 单位是秒!
   * @param fetcher
   */
  constructor(readonly ttl: number, private fetcher: Fetcher<T>) {}

  async get(): Promise<T> {
    if (this.data) {
      return this.data;
    }
    if (!this.fetchTask) {
      this.fetchTask = (async () => {
        try {
          this.data = await this.fetcher();
          if (this.ttl > 0) {
            setTimeout(() => delete this.data, this.ttl * 1000);
          }
          return this.data;
        } finally {
          delete this.fetchTask;
        }
      })();
    }
    return this.fetchTask;
  }
}
