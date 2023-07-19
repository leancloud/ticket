import AV from 'leancloud-storage';
import axios from 'axios';
import _ from 'lodash';
import { TokenExpiredError } from 'jsonwebtoken';

import { regions } from '@/leancloud';
import { HttpError, UnauthorizedError } from '@/common/http';
import { RedisCache } from '@/cache';
import { AuthOptions, Model, field, serialize } from '@/orm';
import { getVerifiedPayloadWithSubRequired, JsonWebTokenError, processKeys } from '@/utils/jwt';
import { roleService } from '@/service/role';
import { Role } from './Role';
import { Vacation } from './Vacation';
import { Group } from './Group';

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

const tdsUserCache = new RedisCache<User | null | undefined>(
  'user:tds_v2',
  (token) => User.loginTDSUser(token),
  (user) => (user ? JSON.stringify(user) : '0'),
  (data) => (data === '0' ? null : User.fromJSON(JSON.parse(data)))
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

export class InvalidCredentialError extends HttpError {
  static httpCode = 401;
  static code = 'INVALID_CREDENTIAL';
  static numCode = 9002;
  public inner?: Error;
  constructor(message: string, innerError?: Error) {
    super(
      InvalidCredentialError.httpCode,
      message,
      InvalidCredentialError.code,
      InvalidCredentialError.numCode
    );
    this.inner = innerError;
  }
}
export class ExpiredCredentialError extends HttpError {
  static httpCode = 401;
  static code = 'EXPIRED_CREDENTIAL';
  static numCode = 9006;
  public inner?: Error;
  constructor(message: string, innerError?: Error) {
    super(
      ExpiredCredentialError.httpCode,
      message,
      ExpiredCredentialError.code,
      ExpiredCredentialError.numCode
    );
    this.inner = innerError;
  }
}

const transform = (error: unknown) => {
  // TokenExpiredError extends JsonWebTokenError
  if (error instanceof TokenExpiredError) {
    return new ExpiredCredentialError(error.message, error);
  }
  if (error instanceof JsonWebTokenError) {
    return new InvalidCredentialError(error.message, error);
  }
  return error;
};
export function transformToHttpError<R>(fn: () => R): R {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.catch((e) => {
        throw transform(e);
      }) as R;
    }
    return result;
  } catch (error) {
    throw transform(error);
  }
}

export class UserNotRegisteredError extends HttpError {
  static httpCode = 401;
  static code = 'USER_NOT_REGISTERED';
  public inner?: Error;
  static numCode = 9003;
  constructor(message: string, innerError?: Error) {
    super(
      UserNotRegisteredError.httpCode,
      message,
      UserNotRegisteredError.code,
      UserNotRegisteredError.numCode
    );
    this.inner = innerError;
  }
}

export class InactiveUserLoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InactiveUserLoginError';
  }

  toJSON() {
    return { name: this.name, message: this.message };
  }
}

const TDSUserSigningKey = processKeys(process.env.TDS_USER_SIGNING_KEY);

export class User extends Model {
  protected static className = '_User';

  protected static avObjectFactory = (className: string, id?: string) => {
    return id ? AV.User.createWithoutData(className, id) : new AV.User();
  };

  // XXX: authData 在 class schema 里设置成了客户端不可见，需要使用 masterKey 获取
  @field()
  @serialize()
  authData?: Record<string, any>;

  @field()
  @serialize()
  thirdPartyData?: Record<string, any>;

  @field()
  @serialize()
  username!: string;

  @field()
  @serialize()
  name?: string;

  @field()
  @serialize()
  email?: string;

  @field()
  @serialize()
  inactive?: true;

  @field()
  @serialize()
  password?: string;

  @serialize()
  sessionToken?: string;

  @field()
  @serialize()
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

  static async findByTDSUserToken(token: string): Promise<User | undefined> {
    const user = await tdsUserCache.get(token);
    return user || undefined;
  }

  static async findWithSessionToken(id: string): Promise<User | undefined> {
    const avUser = AV.User.createWithoutData('_User', id);
    await avUser.fetch({}, { useMasterKey: true });
    return this.fromAVObject(avUser);
  }

  static async findByUsername(username: string) {
    return this.queryBuilder().where('username', '==', username).first({ useMasterKey: true });
  }

  static async upsertByUsername(
    username: string,
    name?: string,
    thirdPartyData?: Record<string, any>
  ) {
    const attributes = { name, thirdPartyData: { ...thirdPartyData, _updated_at: Date.now() } };
    const findAndUpdate = async () => {
      const user = await this.findByUsername(username);
      if (user) {
        const updateName = name && name !== user.name;
        if (updateName || thirdPartyData) {
          user.update(attributes, { useMasterKey: true }).catch(console.error);
        }
        return user.loadSessionToken();
      }
    };
    const sessionToken = await findAndUpdate();
    if (sessionToken) return { sessionToken };
    try {
      const newUser = await AV.User.signUp(username, Math.random().toString(), attributes, {
        useMasterKey: true,
      });
      return { sessionToken: newUser.getSessionToken() };
    } catch (error) {
      if (
        (error as AV.Error).code === AV.Error.USERNAME_TAKEN ||
        (error as AV.Error).code === AV.Error.DUPLICATE_VALUE
      ) {
        return { sessionToken: (await findAndUpdate())! };
      }
      throw error;
    }
  }

  static async loginWithJWT(token: string): Promise<{ sessionToken: string }> {
    const payload = getVerifiedPayloadWithSubRequired(token);
    const { sub, name } = payload;
    return this.upsertByUsername(sub, name);
  }

  static async loginWithLegacyXDAccessToken(
    XDAccessToken: string
  ): Promise<{ sessionToken: string }> {
    let response;
    try {
      response = await axios.get<{
        id: string;
        friendly_name?: string;
        created: string;
        last_login: string;
        site: string;
        adult_type: number;
        taptap_id: string;
        phone: string;
        authoriz_state: number;
      }>('https://api.xd.com/v2/user', {
        params: { access_token: XDAccessToken },
      });
    } catch (error) {
      if (error instanceof Error && 'response' in error) {
        const response = error.response as any;
        if ('data' in response) {
          const message =
            response.data.error_description ?? response.data.error ?? 'Unknown xd.com error';
          throw new HttpError(response.status, message);
        }
      }
      throw error;
    }
    const { id, friendly_name } = response.data;
    return this.upsertByUsername(
      `XD.${id}`,
      friendly_name,
      _.pick(response.data, [
        'id',
        'friendly_name',
        'created',
        'last_login',
        'site',
        'adult_type',
        'taptap_id',
        'phone',
        'authoriz_state',
      ])
    );
  }

  static async loginWithAnonymousId(id: string, name?: string) {
    const user = await AV.User.loginWithAuthData({ id }, 'anonymous', { useMasterKey: true });
    await anonymousUserCache.del(id);
    return { sessionToken: user.getSessionToken() };
  }

  static async loginWithPassword(username: string, password: string) {
    try {
      const user = await AV.User.logIn(username, password);
      return { sessionToken: user.getSessionToken() };
    } catch (err: any) {
      if (err.code === 210) {
        throw new InvalidCredentialError(err.message, err);
      }

      const error = this.hookErrorProcessor(err);

      if (error?.name === 'InactiveUserLoginError') {
        throw new UnauthorizedError(error.message);
      }

      throw err;
    }
  }

  static getVerifiedTDSUserIdentity(token: string) {
    const payload = getVerifiedPayloadWithSubRequired(
      token,
      { issuer: 'tap-support' },
      TDSUserSigningKey
    );
    return { id: payload.sub };
  }

  static async loginTDSUser(token: string): Promise<User | undefined> {
    const { id } = User.getVerifiedTDSUserIdentity(token);
    const user = await this.findByUsername(id);
    if (user) {
      await user.loadSessionToken();
    }
    return user;
  }

  static async loginOrSignUpTDSUser(token: string): Promise<{ sessionToken: string }> {
    const { id } = User.getVerifiedTDSUserIdentity(token);
    return this.upsertByUsername(id);
  }

  static async loginWithTDSUserToken(token: string): Promise<{ sessionToken: string }> {
    const sessionToken = await User.loginOrSignUpTDSUser(token);

    await tdsUserCache.del(token);

    return sessionToken;
  }

  static async associateAnonymousWithTDSUser(token: string, aid: string) {
    const { id } = this.getVerifiedTDSUserIdentity(token);
    const anonymousUser = await this.findByAnonymousId(aid);

    if (anonymousUser) {
      return anonymousUser.update(
        {
          username: id,
        },
        { sessionToken: await anonymousUser.loadSessionToken() }
      );
    }
  }

  static hookErrorProcessor(err: any): Error | undefined {
    if (err.code === 142) {
      const error = (() => {
        try {
          return JSON.parse(
            err.rawMessage.replace(/^Cloud Code validation failed. Error detail : ({.+})$/, '$1')
          );
        } catch (jsonErr) {
          throw err;
        }
      })();

      return error;
    }
  }

  static async getAdmins(active?: boolean): Promise<User[]> {
    const adminRole = await Role.getAdminRole();
    const qb = User.queryBuilder().relatedTo(adminRole, 'users').orderBy('email,username');

    if (active !== undefined) {
      if (active) {
        qb.where('inactive', 'not-exists');
      } else {
        qb.where('inactive', '==', true);
      }
    }

    return qb.find({ useMasterKey: true });
  }

  static async getCustomerServices(active?: boolean): Promise<User[]> {
    const csRole = await Role.getCustomerServiceRole();
    const qb = User.queryBuilder().relatedTo(csRole, 'users').orderBy('email,username');

    if (active !== undefined) {
      if (active) {
        qb.where('inactive', 'not-exists');
      } else {
        qb.where('inactive', '==', true);
      }
    }

    return qb.limit(1000).find({ useMasterKey: true });
  }

  static async getCustomerServicesOnDuty(): Promise<User[]> {
    const [csRole, vacationerIds] = await Promise.all([
      Role.getCustomerServiceRole(),
      Vacation.getVacationerIds(),
    ]);
    const qb = User.queryBuilder()
      .relatedTo(csRole, 'users')
      .where('objectId', 'not-in', vacationerIds)
      .where('inactive', 'not-exists');

    return qb.find({ useMasterKey: true });
  }

  static async isAdmin(user: string | { id: string }): Promise<boolean> {
    const userId = typeof user === 'string' ? user : user.id;
    const adminRole = await Role.getAdminRole();
    const query = User.queryBuilder()
      .relatedTo(Role, 'users', adminRole.id)
      .where('objectId', '==', userId);
    return !!(await query.first({ useMasterKey: true }));
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

  async isAdmin() {
    const roles = await roleService.getSystemRolesForUser(this.id);
    return roles.includes('admin');
  }

  async isCustomerService() {
    const roles = await roleService.getSystemRolesForUser(this.id);
    return ['customerService', 'admin'].some((role) => roles.includes(role));
  }

  async isStaff() {
    const roles = await roleService.getSystemRolesForUser(this.id);
    return ['customerService', 'staff', 'admin'].some((role) => roles.includes(role));
  }

  async isCollaborator() {
    const roles = await roleService.getSystemRolesForUser(this.id);
    return roles.includes('collaborator');
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

  async refreshSessionToken(): Promise<void> {
    const avUser = AV.User.createWithoutData('_User', this.id) as AV.User;
    await avUser.refreshSessionToken({ useMasterKey: true });
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
