import crypto from 'crypto';
import LRU from 'lru-cache';

import { config } from '../config';

const cache = new LRU<string, string>({
  max: 100_000,
});

function getGaravatarHash(email: string): string {
  const cached = cache.get(email);
  if (cached) {
    return cached;
  }
  const hash = crypto.createHash('md5').update(email.trim()).digest('hex');
  cache.set(email, hash);
  return hash;
}

export function getGravatarURL(email: string): string {
  return config.gravatarURL + '/' + getGaravatarHash(email);
}
