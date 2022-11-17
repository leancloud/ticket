export class LocalStorage implements Storage {
  readonly data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear() {
    this.data.clear();
  }

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  key(index: number) {
    if (index < 0 || index >= this.data.size) {
      return null;
    }
    const keys = this.data.keys();
    for (let i = 0; i < index; ++i) {
      keys.next();
    }
    return keys.next().value;
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}
