import { sign } from 'jsonwebtoken';
import { CreateAuthJwtOptions } from './types';

class TapSupportService {
  constructor(private authSecret?: string) {}

  createAuthJwt(options: CreateAuthJwtOptions) {
    if (!this.authSecret) {
      throw new Error('no tap-support auth secret provided');
    }

    const payload = {
      name: options.customUsername,
    };

    return sign(payload, this.authSecret, {
      subject: options.customId,
      issuer: 'LeanTicket',
      audience: 'TapSupport',
    });
  }
}

export default new TapSupportService(process.env.TAP_SUPPORT_AUTH_SECRET);
