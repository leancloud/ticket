import jwt, { JsonWebTokenError, JwtPayload, SignOptions } from 'jsonwebtoken';

export const processKeys = (originalKeys: string | undefined) =>
  originalKeys?.split(',').map(Buffer.from);

const publicKeys = processKeys(process.env.PUBLIC_KEYS);

export { JsonWebTokenError };

export const getVerifiedPayload = (
  token: string,
  options?: jwt.VerifyOptions & { complete?: false },
  keys = publicKeys
) => {
  if (keys == undefined || keys.length === 0) {
    throw new JsonWebTokenError('public keys not set');
  }
  for (const key of keys) {
    try {
      return jwt.verify(token, key, options) as JwtPayload;
    } catch (error) {
      if (error instanceof JsonWebTokenError && error.message !== 'invalid signature') {
        throw error;
      }
    }
  }
  throw new JsonWebTokenError('signature not matched');
};

export const signPayload = (payload: JwtPayload, options?: SignOptions) => {
  if (publicKeys === undefined || publicKeys.length === 0) {
    throw new JsonWebTokenError('PUBLIC_KEYS not set');
  }
  return jwt.sign(payload, publicKeys[0], options);
};
