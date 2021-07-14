import AV from 'leancloud-storage';

import { redis } from '../../cache';

export interface User {
  id: string;
  username: string;
  name?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthedUser extends User {
  sessionToken: string;
}

export function encode(user: User) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function decode(data: ReturnType<typeof encode>): User {
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

export async function getBySessionToken(token: string): Promise<AuthedUser> {
  const user = await AV.User.become(token);
  return {
    id: user.id!,
    username: user.get('username'),
    name: user.get('name') ?? undefined,
    email: user.get('email') ?? undefined,
    createdAt: user.createdAt!,
    updatedAt: user.updatedAt!,
    sessionToken: user.getSessionToken(),
  };
}

let staffRole: AV.Role | undefined;

async function getStaffRole(): Promise<AV.Role> {
  if (staffRole) {
    return staffRole;
  }
  const query = new AV.Query(AV.Role);
  query.equalTo('name', 'customerService');
  const role = await query.first();
  if (!role) {
    console.error('!!! No customerService role !!!');
    process.exit(1);
  }
  return role;
}

export async function isStaff(id: string): Promise<boolean> {
  const staffRole = await getStaffRole();
  const userQuery = staffRole.getUsers().query().select('objectId').equalTo('objectId', id);
  const user = await userQuery.first({ useMasterKey: true });
  return !!user;
}
