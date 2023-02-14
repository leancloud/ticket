import jwt, { JsonWebTokenError, JwtPayload, Secret, SignOptions } from 'jsonwebtoken';

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
      if (
        error instanceof JsonWebTokenError &&
        error.message !== 'invalid signature' &&
        error.message !== 'invalid algorithm'
      ) {
        throw error;
      }
    }
  }
  throw new JsonWebTokenError('signature not matched');
};

export const getVerifiedPayloadWithSubRequired = (
  ...args: Parameters<typeof getVerifiedPayload>
) => {
  const payload = getVerifiedPayload(...args);
  const { sub } = payload;
  if (!sub) {
    throw new JsonWebTokenError('sub field is required');
  }
  return {
    ...payload,
    sub,
  } as JwtPayload & { sub: string };
};

export const signPayload = (
  payload: JwtPayload,
  key: Secret | undefined,
  options?: SignOptions
) => {
  if (key === undefined) {
    throw new JsonWebTokenError('signing key not set');
  }
  return jwt.sign(payload, key, options);
};
