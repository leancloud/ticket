import crypto from 'crypto';
import LRU from 'lru-cache';

import { config } from '@/config';
import { User } from '@/model/User';

class GravatarUrlManager {
  static cache = new LRU<string, string>({ max: 100_000 });

  static getHash(email: string): string {
    const cached = GravatarUrlManager.cache.get(email);
    if (cached) {
      return cached;
    }
    const hash = crypto.createHash('md5').update(email.trim()).digest('hex');
    GravatarUrlManager.cache.set(email, hash);
    return hash;
  }

  static getUrl(email: string): string {
    return config.gravatarURL + '/' + GravatarUrlManager.getHash(email);
  }
}

export class UserResponse {
  constructor(readonly user: User) {}

  toJSON() {
    return {
      id: this.user.id,
      username: this.user.username,
      nickname: this.user.name ?? this.user.username,
      active: !this.user.inactive,
      avatarUrl: GravatarUrlManager.getUrl(this.user.email ?? this.user.username),
      email: this.user.email,
    };
  }
}
