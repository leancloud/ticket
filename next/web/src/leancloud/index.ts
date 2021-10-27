import * as LC from 'open-leancloud-storage/core';
import { authModule } from 'open-leancloud-storage/auth';
import axios, { AxiosError } from 'axios';

LC.use(authModule);

const { VITE_LC_APP_ID, VITE_LC_APP_KEY, VITE_LC_API_SERVER } = import.meta.env;
export const app = LC.init({
  appId: VITE_LC_APP_ID,
  appKey: VITE_LC_APP_KEY,
  serverURL: VITE_LC_API_SERVER,
});

export const auth = app.auth();

export const http = axios.create();
http.interceptors.request.use((config) => ({
  ...config,
  headers: {
    ...config.headers,
    'X-LC-Session': auth.currentUser?.sessionToken,
  },
}));

interface APIError {
  message: string;
}

http.interceptors.response.use(undefined, async (error: AxiosError<APIError>) => {
  if (error.response) {
    throw new Error(error.response.data.message);
  }
  throw error;
});
