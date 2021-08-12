import { init, use } from 'open-leancloud-storage/core';
import { authModule } from 'open-leancloud-storage/auth';
import { storageModule } from 'open-leancloud-storage/storage';
import axios from 'axios';

export type { User } from 'open-leancloud-storage/auth';

use(authModule);
use(storageModule);
use({
  name: 'do-not-persist-current-user',
  onLoad: ({ adapters }) => {
    if (!adapters.storage) {
      throw new Error('No storage adapter, you should set adapters first.');
    }
    const storage = adapters.storage;
    adapters.storage = {
      async: storage.async as any,
      getItem: storage.getItem.bind(storage) as any,
      removeItem: storage.removeItem.bind(storage),
      clear: storage.clear.bind(storage),
      setItem: (key, value) => {
        if (key.endsWith('current_user')) {
          return;
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
http.interceptors.request.use((config) => ({
  ...config,
  headers: {
    ...config.headers,
    'X-LC-Session': auth.currentUser?.sessionToken,
  },
}));
