import AV from 'leancloud-storage';
import axios from 'axios';
import _ from 'lodash';

import { regions } from '../leancloud';
import { config } from '../config';
import { RedisCache } from '../cache';
import { AuthOptions, Model, field } from '../orm';
import { Role } from './Role';

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

export class User extends Model {
  static readonly className = '_User';

  static readonly avObjectConstructor = AV.User;

  @field()
  authData?: Record<string, any>;

  @field()
  username!: string;

  @field()
  name?: string;

  @field()
  email?: string;

  @field({
    encode: false,
    decode: false,
    onEncode: (user: User, avUser) => {
      if (user.sessionToken) {
        (avUser as any)._sessionToken = user.sessionToken;
      }
    },
    onDecode: (user: User, avUser) => {
      const sessionToken = (avUser as AV.User).getSessionToken();
      if (sessionToken) {
        user.sessionToken = sessionToken;
      }
    },
  })
  sessionToken?: string;

  @field({
    avObjectKey: 'categories',
    encode: false,
    decode: (data: { objectId: string }[]) => data.map((item) => item.objectId),
  })
  categoryIds?: string[];

  private isCustomerServiceTask?: Promise<boolean>;

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

  static async getCustomerServices(): Promise<User[]> {
    const customerService = await Role.getCustomerServiceRole();
    const query = User.queryBuilder().relatedTo(Role, 'users', customerService.id);
    return query.find({ useMasterKey: true });
  }

  static async isCustomerService(user: string | { id: string }): Promise<boolean> {
    const userId = typeof user === 'string' ? user : user.id;
    const csRole = await Role.getCustomerServiceRole();
    const query = User.queryBuilder()
      .relatedTo(Role, 'users', csRole.id)
      .where('objectId', '==', userId);
    return !!(await query.first({ useMasterKey: true }));
  }

  isCustomerService(): Promise<boolean> {
    if (!this.isCustomerServiceTask) {
      this.isCustomerServiceTask = (async () => {
        try {
          return User.isCustomerService(this);
        } catch (error) {
          delete this.isCustomerServiceTask;
          throw error;
        }
      })();
    }
    return this.isCustomerServiceTask;
  }

  getAuthOptions(): AuthOptions {
    if (!this.sessionToken) {
      throw new Error('User instance has no session token');
    }
    return { sessionToken: this.sessionToken };
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

  async canCreateTicket(): Promise<boolean> {
    if (!config.enableLeanCloudIntegration) {
      return true;
    }
    if (await this.isCustomerService()) {
      return true;
    }
    if (this.authData) {
      const accounts = await this.getLeanCloudAccounts();
      return accounts.some((account) => !!account.current_support_service);
    }
    return false;
  }
}

export const systemUser = new User();
systemUser.id = 'system';
systemUser.username = 'system';
systemUser.createdAt = new Date(0);
systemUser.updatedAt = new Date(0);
