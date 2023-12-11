import { useEffect } from 'react';
import { parse } from 'query-string';
import { User } from 'open-leancloud-storage/auth';
import { customAlphabet } from 'nanoid';

import { auth, http } from '@/leancloud';
import { useSetAuth } from '@/states/auth';

async function login(data: any) {
  let sessionToken: string;
  try {
    const res = await http.post<{ sessionToken: string }>('/api/2/users', data);
    sessionToken = res.data.sessionToken;
  } catch (error: any) {
    const message = error.response?.data?.message;
    if (message) {
      throw new Error(message);
    }
    throw error;
  }
  return await auth.loginWithSessionToken(sessionToken);
}

interface AuthContext {
  hash: Record<string, any>;
  query: Record<string, any>;
}

type Strategy = (ctx: AuthContext) => Promise<User | undefined>;

export const loginByAnonymousId: Strategy = async ({ hash }) => {
  const anonymousId = hash['anonymous-id'];
  if (anonymousId) {
    return login({ type: 'anonymous', anonymousId });
  }
};

export const loginByXDAccessToken: Strategy = async ({ hash }) => {
  const XDAccessToken = hash['xd-access-token'];
  if (XDAccessToken) {
    return login({ XDAccessToken });
  }
};

export const loginByTDSCredential: Strategy = async ({ hash }) => {
  const token = hash['tds-credential'];
  if (token) {
    return login({
      type: 'tds-user',
      token,
      associateAnonymousId: hash['associate-anonymous-id'],
    });
  }
};

export const loginByJWT: Strategy = async ({ hash }) => {
  const jwt = hash['credential'];
  if (jwt) {
    return login({ type: 'jwt', jwt });
  }
};

export const loginByCurrentUser: Strategy = async () => {
  return auth.currentUser || undefined;
};

export const loginByLocalAnonymousId: Strategy = async ({ query }) => {
  const from = query.from;
  if (typeof from !== 'string' || from.length > 16) {
    return;
  }
  const storageKey = `TapDesk/${from}/anonymousId`;
  let anonymousId = localStorage.getItem(storageKey);
  if (!anonymousId) {
    const genAnonymousId = customAlphabet(
      '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    );
    anonymousId = `${from}-${genAnonymousId(32)}`;
    localStorage.setItem(storageKey, anonymousId);
  }
  return login({ type: 'anonymous', anonymousId });
};

const { hash: hashSnapshot, search: searchSnapshot } = window.location;

let loginPromise: Promise<User | undefined> | undefined;
const loginStrategies: Strategy[] = [];

interface UseAuthLoginOptions {
  strategies: Strategy[];
}

export function useAutoLogin({ strategies }: UseAuthLoginOptions) {
  const setAuth = useSetAuth();
  useEffect(() => {
    strategies.forEach((strategy) => loginStrategies.push(strategy));
    if (loginPromise) {
      return;
    }
    setAuth({ loading: true });
    loginPromise = (async () => {
      const query = parse(searchSnapshot);
      const hash = parse(hashSnapshot);
      while (loginStrategies.length) {
        const strategy = loginStrategies.shift()!;
        const user = await strategy({ hash, query });
        if (user) {
          return user;
        }
      }
    })();
    loginPromise
      .then((user) => {
        setAuth({ user });
        loginPromise = undefined;
      })
      .catch((error) => setAuth({ error }));
  }, []);
}
