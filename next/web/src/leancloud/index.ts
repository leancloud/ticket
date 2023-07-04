import * as LC from 'open-leancloud-storage/core';
import { authModule } from 'open-leancloud-storage/auth';
import { cloudModule } from 'open-leancloud-storage/cloud';
import { storageModule } from 'open-leancloud-storage/storage';
import { liveQueryModule } from 'open-leancloud-storage/live-query';
import axios from 'axios';
import { useQuery } from 'react-query';
import { atom, selector, useRecoilValue, useSetRecoilState } from 'recoil';
import { mergeWith } from 'lodash-es';

LC.use(authModule);
LC.use(cloudModule);
LC.use(storageModule);
LC.use(liveQueryModule);

export const ENABLE_LEANCLOUD_INTEGRATION = import.meta.env.VITE_ENABLE_LEANCLOUD_INTEGRATION;

const { VITE_LC_APP_ID, VITE_LC_APP_KEY, VITE_LEANCLOUD_API_HOST } = import.meta.env;

export const app = LC.init({
  appId: VITE_LC_APP_ID,
  appKey: VITE_LC_APP_KEY,
  serverURL: VITE_LEANCLOUD_API_HOST,
});

export const auth = app.auth();

export const db = app.database();

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

export interface CurrentUser {
  id: string;
  displayName: string;
}

function getCurrentUser(): CurrentUser | undefined {
  if (auth.currentUser) {
    const { id, data } = auth.currentUser;
    return {
      id,
      displayName: data.name || data.username,
    };
  }
}

const currentUserState = atom({
  key: 'currentUser',
  default: getCurrentUser(),
});

export const useCurrentUser = () => useRecoilValue(currentUserState);

export const useRefreshCurrentUser = () => {
  const setCurrentUser = useSetRecoilState(currentUserState);
  return () => setCurrentUser(getCurrentUser());
};

export interface CustomerServicePermissions {
  view: boolean;
  ticketList: boolean;
  statistics: boolean;
}

export const DefaultGroupPermission: CustomerServicePermissions = {
  view: true,
  ticketList: true,
  statistics: false,
};

export const GroupPermissionDescriptions: Record<keyof CustomerServicePermissions, string> = {
  view: '视图',
  ticketList: '工单列表',
  statistics: '工单统计',
};

interface GroupData {
  permissions?: CustomerServicePermissions;
}

const currentUserGroupsState = selector<GroupData[]>({
  key: 'currentUserGroups',
  get: async ({ get }) => {
    const currentUser = get(currentUserState);
    if (!currentUser) {
      return [];
    }
    try {
      const groupRoles = await auth
        .queryRole()
        .where('name', 'not-in', ['customerService', 'staff', 'admin', 'collaborator'])
        .where('users', '==', db.class('_User').object(currentUser.id))
        .find();

      const groups = await db
        .query('Group')
        .where(
          'role',
          'in',
          groupRoles.map((role) => db.class('_Role').object(role.id))
        )
        .find();

      return groups.map((group) => group.toJSON());
    } catch {
      return [];
    }
  },
});

const currentUserPermissions = selector({
  key: 'currentUserPermissions',
  get: async ({ get }) => {
    const groups = get(currentUserGroupsState);

    return groups
      .map((g) => ({ ...DefaultGroupPermission, ...g.permissions }))
      .reduce<CustomerServicePermissions>(
        (acc, cur) => mergeWith(acc, cur, (v1: boolean, v2: boolean) => v1 || v2),
        {} as CustomerServicePermissions
      );
  },
});

export const useCurrentUserPermissions = () => useRecoilValue(currentUserPermissions);

const currentUserRolesState = selector({
  key: 'currentUserRoles',
  get: async ({ get }) => {
    const currentUser = get(currentUserState);
    if (!currentUser) {
      return [];
    }
    return auth
      .queryRole()
      .where('name', 'in', ['customerService', 'staff', 'admin'])
      .where('users', '==', db.class('_User').object(currentUser.id))
      .find()
      .then((roles) => roles.map((role) => role.name));
  },
});

const currentUserIsAdminState = selector({
  key: 'currentUserIsAdmin',
  get: ({ get }) => {
    const roles = get(currentUserRolesState);
    return roles.includes('admin');
  },
});

export const useCurrentUserIsAdmin = () => useRecoilValue(currentUserIsAdminState);

const currentUserIsCustomerServiceState = selector({
  key: 'currentUserIsCS',
  get: ({ get }) => {
    const roles = get(currentUserRolesState);
    return roles.includes('customerService') || roles.includes('admin');
  },
});

export const useCurrentUserIsCustomerService = () =>
  useRecoilValue(currentUserIsCustomerServiceState);

export type LeanCloudRegion = 'cn-n1' | 'cn-e1' | 'us-w1';

export interface LeanCloudApp {
  appId: string;
  appName: string;
  region: LeanCloudRegion;
}

async function getLeanCloudApps(): Promise<LeanCloudApp[]> {
  return cloud.run('getLeanCloudApps');
}

export async function getLeanCloudApp(
  appId: string,
  username: string
): Promise<LeanCloudApp | null> {
  return cloud.run('getLeanCloudApp', { appId, username });
}

export async function getLeanCloudAppUrl(appId: string, region: string): Promise<string | null> {
  return cloud.run('getLeanCloudAppUrl', { appId, region });
}

export function useLeanCloudApps() {
  return useQuery({
    queryKey: 'leanCloudApps',
    queryFn: getLeanCloudApps,
    staleTime: Infinity,
  });
}
