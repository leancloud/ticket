import { init, use, setAdapters } from 'open-leancloud-storage/core';
import { authModule } from 'open-leancloud-storage/auth';
import { storageModule } from 'open-leancloud-storage/storage';
import axios from 'axios';

export type { User } from 'open-leancloud-storage/auth';

setAdapters({
  storage: {
    async: false,
    getItem: (key: string) => null,
    setItem: (key: string, value: string) => undefined,
    removeItem: (key: string) => undefined,
    clear: () => undefined,
  },
});

use(authModule);
use(storageModule);

export const app = init({
  appId: import.meta.env.VITE_LC_APP_ID,
  appKey: import.meta.env.VITE_LC_APP_KEY,
  serverURL: import.meta.env.VITE_LC_API_SERVER,
});

export const auth = app.auth();

export const db = app.database();

export const storage = app.storage();

export const http = axios.create();
http.interceptors.request.use((config) => ({
  ...config,
  headers: {
    ...config.headers,
    'X-LC-Session': auth.currentUser?.sessionToken,
  },
}));
