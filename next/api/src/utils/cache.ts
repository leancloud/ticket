export class CacheItem<T> {
  readonly createdAt: number;
  readonly expiredAt: number;

  constructor(readonly data: T, readonly lifetime: number) {
    this.createdAt = Date.now();
    this.expiredAt = this.createdAt + lifetime;
  }

  isExpired(): boolean {
    return Date.now() > this.expiredAt;
  }
}
