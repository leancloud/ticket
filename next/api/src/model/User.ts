import AV from 'leancloud-storage';
import axios from 'axios';
import _ from 'lodash';
import mem from 'p-memoize';

import { regions } from '@/leancloud';
import { RedisCache } from '@/cache';
import { AuthOptions, Model, field } from '@/orm';
import { Role } from './Role';
import { Vacation } from './Vacation';
import { Group } from './Group';
import { getVerifiedPayload, JsonWebTokenError } from '@/utils/jwt';

function encodeAVUser(user: AV.User): string {
  const json = user.toFullJSON();
  json._sessionToken = user.getSessionToken();
  return JSON.stringify(json);
}

function decodeAVUser(data: string): AV.User {
  const json = JSON.parse(data);
  const user = AV.parseJSON(json);
  user._sessionToken = json._sessionToken;
  return user;
}

const userCache = new RedisCache<AV.User>(
  'user:session',
  (sessionToken: string) => AV.User.become(sessionToken),
  encodeAVUser,
  decodeAVUser
);

const anonymousUserCache = new RedisCache<AV.User | null | undefined>(
  'user:anonymous',
  async (id: string) => {
    try {
      return await AV.User.loginWithAuthData({ id }, 'anonymous', { failOnNotExist: true });
    } catch (error: any) {
      if (error.code === 211) {
        return undefined;
      }
      throw error;
    }
  },
  (user) => (user ? encodeAVUser(user) : 'null'),
  (data) => (data === 'null' ? null : decodeAVUser(data))
);

export interface LeanCloudAccount {
  current_support_service?: any;
}

export interface TinyUserInfo {
  objectId: string;
  username: string;
  name?: string;
  email?: string;
}

const getRoles = mem(
  async (user: User) => {
    const roles = await Role.queryBuilder()
      .where('users', '==', user.toPointer())
      .where('name', 'in', ['staff', 'customerService', 'admin'])
      .find();
    return roles.map((role) => role.name);
  },
  { maxAge: 10_000 }
);

export class InvalidLoginCredentialError extends Error {
  public inner?: Error;
  constructor(message: string, innerError?: Error) {
    super(message);
    this.inner = innerError;
  }
}

export class User extends Model {
  protected static className = '_User';

  protected static avObjectFactory = (className: string, id?: string) => {
    return id ? AV.User.createWithoutData(className, id) : new AV.User();
  };

  // XXX: authData 在 class schema 里设置成了客户端不可见，需要使用 masterKey 获取
  @field()
  authData?: Record<string, any>;

  @field()
  username!: string;

  @field()
  name?: string;

  @field()
  email?: string;

  sessionToken?: string;

  @field()
  categories?: {
    objectId: string;
    name: string;
  }[];

  get categoryIds() {
    return this.categories?.map((c) => c.objectId);
  }

  static async findById(id: string): Promise<User | undefined> {
    if (id === systemUser.id) {
      return systemUser;
    }
    return this.find(id, { useMasterKey: true });
  }

  /**
   * @deprecated
   */
  static async findBySessionToken(sessionToken: string): Promise<User> {
    const avUser = await userCache.get(sessionToken);
    return this.fromAVObject(avUser);
  }

  static async findByAnonymousId(aid: string): Promise<User | undefined> {
    const avUser = await anonymousUserCache.get(aid);
    if (avUser) {
      return this.fromAVObject(avUser);
    }
  }

  static async findWithSessionToken(id: string): Promise<User | undefined> {
    const avUser = AV.User.createWithoutData('_User', id);
    await avUser.fetch({}, { useMasterKey: true });
    return this.fromAVObject(avUser);
  }

  static async findByUsername(username: string) {
    return this.queryBuilder().where('username', '==', username).first({ useMasterKey: true });
  }

  static async loginWithJWT(token: string): Promise<{ sessionToken: string }> {
    let payload;
    try {
      payload = getVerifiedPayload(token);
    } catch (error) {
      if (error instanceof JsonWebTokenError) {
        throw new InvalidLoginCredentialError(error.message, error);
      }
      throw error;
    }
    const { sub, name } = payload;
    if (sub === undefined) {
      throw new InvalidLoginCredentialError('sub field is required');
    }
    const username = sub;
    const findAndUpdate = async () => {
      const user = await this.findByUsername(username);
      if (user) {
        if (name && name !== user.name) {
          user.update({ name }, { useMasterKey: true }).catch(console.error);
        }
        return user.loadSessionToken();
      }
    };
    const sessionToken = await findAndUpdate();
    if (sessionToken) return { sessionToken };
    try {
      const newUser = await AV.User.signUp(username, Math.random().toString(), { name });
      return { sessionToken: await newUser.getSessionToken() };
    } catch (error) {
      if (error instanceof AV.Error && error.code === AV.ErrorCode.USERNAME_TAKEN) {
        return { sessionToken: (await findAndUpdate())! };
      }
      throw error;
    }
  }

  static async loginWithAnonymousId(id: string, name?: string) {
    throw new Error('Not implemented')
  }

  static async getCustomerServices(): Promise<User[]> {
    const csRole = await Role.getCustomerServiceRole();
    return User.queryBuilder().relatedTo(csRole, 'users').find({ useMasterKey: true });
  }

  static async getCustomerServicesOnDuty(): Promise<User[]> {
    const [csRole, vacationerIds] = await Promise.all([
      Role.getCustomerServiceRole(),
      Vacation.getVacationerIds(),
    ]);
    return User.queryBuilder()
      .relatedTo(csRole, 'users')
      .where('objectId', 'not-in', vacationerIds)
      .find({ useMasterKey: true });
  }

  static async isCustomerService(user: string | { id: string }): Promise<boolean> {
    const userId = typeof user === 'string' ? user : user.id;
    const csRole = await Role.getCustomerServiceRole();
    const query = User.queryBuilder()
      .relatedTo(Role, 'users', csRole.id)
      .where('objectId', '==', userId);
    return !!(await query.first({ useMasterKey: true }));
  }

  static async isStaff(user: string | { id: string }): Promise<boolean> {
    const userId = typeof user === 'string' ? user : user.id;
    const csRole = await Role.getStaffRole();
    const query = User.queryBuilder()
      .relatedTo(Role, 'users', csRole.id)
      .where('objectId', '==', userId);
    return !!(await query.first({ useMasterKey: true }));
  }

  async isCustomerService(): Promise<boolean> {
    const roles = await getRoles(this);
    return roles.includes('customerService') || roles.includes('admin');
  }

  async isStaff(): Promise<boolean> {
    const roles = await getRoles(this);
    return roles.includes('staff') || roles.includes('customerService') || roles.includes('admin');
  }

  getAuthOptions(): AuthOptions {
    if (!this.sessionToken) {
      throw new Error('User instance has no session token');
    }
    return { sessionToken: this.sessionToken };
  }

  private async fetchAuthData(): Promise<Record<string, any> | undefined> {
    const avObj = AV.User.createWithoutData('_User', this.id);
    await avObj.fetch({ keys: ['authData'] }, { useMasterKey: true });
    this.authData = avObj.get('authData');
    return this.authData;
  }

  async getLeanCloudAccounts(): Promise<LeanCloudAccount[]> {
    if (!this.authData) {
      throw new Error('user has no authData');
    }
    const tasks = regions.map(({ oauthPlatform, serverDomain }) => {
      const authData = this.authData![oauthPlatform];
      if (authData) {
        return axios.get(`${serverDomain}/1.1/open/clients/${authData.uid}/account`, {
          headers: {
            Authorization: `Bearer ${authData.access_token}`,
          },
        });
      }
    });
    const responses = await Promise.all(_.compact(tasks));
    return responses.map((res) => res.data);
  }

  async hasBizLeanCloudApp(): Promise<boolean> {
    await this.fetchAuthData();
    const accounts = await this.getLeanCloudAccounts();
    return accounts.some((account) => !!account.current_support_service);
  }

  getTinyInfo(): TinyUserInfo {
    return {
      objectId: this.id,
      username: this.username,
      name: this.name,
      email: this.email,
    };
  }

  getDisplayName(): string {
    return this.name ?? this.username;
  }

  async loadSessionToken(): Promise<string> {
    if (!this.sessionToken) {
      const avUser = AV.User.createWithoutData('_User', this.id) as AV.User;
      await avUser.fetch({ keys: ['sessionToken'] }, { useMasterKey: true });
      this.sessionToken = avUser.getSessionToken();
    }
    return this.sessionToken;
  }

  async getGroups(): Promise<Group[]> {
    const roles = await Role.queryBuilder()
      .where('name', 'starts-with', 'group_')
      .where('users', '==', this.toPointer())
      .find({ useMasterKey: true });
    return Group.queryBuilder()
      .where(
        'role',
        'in',
        roles.map((r) => r.toPointer())
      )
      .find({ useMasterKey: true });
  }
}

User.onDecode(({ avObject, instance }) => {
  instance.sessionToken = (avObject as any)._sessionToken;
});

class SystemUser extends User {
  constructor() {
    super();
    this.id = 'system';
    this.username = 'system';
    this.createdAt = new Date(0);
    this.updatedAt = new Date(0);
  }

  async isCustomerService() {
    return true;
  }

  getAuthOptions() {
    return { useMasterKey: true };
  }
}

export const systemUser = new SystemUser();
