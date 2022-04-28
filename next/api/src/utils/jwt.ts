import jwt, { JsonWebTokenError, JwtPayload } from 'jsonwebtoken';

const publicKeys = process.env.PUBLIC_KEYS?.split(',')?.map(Buffer.from);

export { JsonWebTokenError };

export const getVerifiedPayload = (token: string) => {
  if (publicKeys == undefined || publicKeys.length === 0) {
    throw new JsonWebTokenError('PUBLIC_KEYS not set');
  }
  for (const key of publicKeys) {
    try {
      return jwt.verify(token, key) as JwtPayload;
    } catch (error) {
      if (error instanceof JsonWebTokenError && error.message !== 'invalid signature') {
        throw error;
      }
    }
  }
  throw new JsonWebTokenError('signature not matched');
};
