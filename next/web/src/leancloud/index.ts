import * as LC from 'open-leancloud-storage/core';
import { authModule } from 'open-leancloud-storage/auth';
import { cloudModule } from 'open-leancloud-storage/cloud';
import { storageModule } from 'open-leancloud-storage/storage';
import axios, { AxiosError } from 'axios';
import { useRef } from 'react';
import { useQuery } from 'react-query';

LC.use(authModule);
LC.use(cloudModule);
LC.use(storageModule);

export const ENABLE_LEANCLOUD_INTEGRATION = import.meta.env.VITE_ENABLE_LEANCLOUD_INTEGRATION;

const { VITE_LC_APP_ID, VITE_LC_APP_KEY, VITE_LEANCLOUD_API_HOST } = import.meta.env;

export const app = LC.init({
  appId: VITE_LC_APP_ID,
  appKey: VITE_LC_APP_KEY,
  serverURL: VITE_LEANCLOUD_API_HOST,
});

export const auth = app.auth();

export const cloud = app.cloud();

export const storage = app.storage();

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

export interface CurrentUser {
  id: string;
  displayName: string;
}

export function getCurrentUser(): CurrentUser | undefined {
  const user = auth.currentUser;
  if (user) {
    return {
      id: user.id,
      displayName: user.data.name || user.data.username,
    };
  }
}

export function useCurrentUser(): CurrentUser | undefined {
  return useRef(getCurrentUser()).current;
}

export type LeanCloudRegion = 'cn-n1' | 'cn-e1' | 'us-w1';

export interface LeanCloudApp {
  app_id: string;
  app_name: string;
  region: LeanCloudRegion;
}

export async function fetchLeanCloudApps(): Promise<LeanCloudApp[]> {
  return cloud.run('getLeanCloudApps');
}

export function useLeanCloudApps() {
  return useQuery({
    queryKey: 'leanCloudApps',
    queryFn: fetchLeanCloudApps,
    staleTime: Infinity,
  });
}
