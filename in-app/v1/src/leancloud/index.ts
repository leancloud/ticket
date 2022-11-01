import { init, use } from 'open-leancloud-storage/core';
import { authModule } from 'open-leancloud-storage/auth';
import { storageModule } from 'open-leancloud-storage/storage';
import { liveQueryModule } from 'open-leancloud-storage/live-query';
import axios from 'axios';

export type { User } from 'open-leancloud-storage/auth';

use(authModule);
use(storageModule);
use(liveQueryModule);
use({
  name: 'do-not-persist-current-user',
  onLoad: ({ adapters }) => {
    if (!adapters.storage) {
      throw new Error('No storage adapter, you should set adapters first.');
    }
    const storage = adapters.storage;
    adapters.storage = {
      async: storage.async as any,
      getItem: ((key: string) => {
        if (key.endsWith('current_user')) {
          return sessionStorage.getItem(key);
        }
        return storage.getItem(key);
      }) as any,
      removeItem: (key: string) => {
        if (key.endsWith('current_user')) {
          return sessionStorage.removeItem(key);
        }
        return storage.removeItem(key);
      },
      clear: storage.clear.bind(storage),
      setItem: (key, value) => {
        if (key.endsWith('current_user')) {
          return sessionStorage.setItem(key, value);
        }
        return storage.setItem(key, value);
      },
    };
  },
});

export const app = init({
  appId: import.meta.env.VITE_LC_APP_ID,
  appKey: import.meta.env.VITE_LC_APP_KEY,
  serverURL: import.meta.env.VITE_LC_API_SERVER,
});

export const auth = app.auth();

export const db = app.database();

export const storage = app.storage();

export const http = axios.create();
http.interceptors.request.use((config) => {
  if (auth.currentUser) {
    if (!config.headers) {
      config.headers = {};
    }
    config.headers['X-LC-Session'] = auth.currentUser.sessionToken;
  }
  return config;
});

http.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const message = error.response?.data?.message;
    if (message) {
      return Promise.reject(Error(message));
    }

    return Promise.reject(error);
  }
);
