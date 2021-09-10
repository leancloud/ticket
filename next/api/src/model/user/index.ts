import AV from 'leancloud-storage';

import { LocalCache, RedisCache } from '../../cache';
import { Query } from '../../query';
import { getCustomerServiceRole } from './utils';

const localCustomerServiceRole = new LocalCache(0, getCustomerServiceRole);

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

export class User {
  id: string;
  username: string;
  name?: string;
  email?: string;
  tags?: string[];
  sessionToken?: string;
  createdAt: Date;
  updatedAt: Date;

  protected _isCustomerService?: boolean;

  constructor(data: {
    id: string;
    username: string;
    name?: string;
    email?: string;
    tags?: string[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.username = data.username;
    this.name = data.name ?? undefined;
    this.email = data.email ?? undefined;
    this.tags = data.tags ?? undefined;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static fromAVObject(object: AV.Object) {
    return new User({
      id: object.id!,
      username: object.get('username'),
      name: object.get('name'),
      email: object.get('email'),
      tags: object.get('tags'),
      createdAt: object.createdAt!,
      updatedAt: object.updatedAt!,
    });
  }

  static className = '_User';

  static fromAVUser(avUser: AV.User) {
    const user = User.fromAVObject(avUser);
    user.sessionToken = avUser.getSessionToken();
    return user;
  }

  static ptr(id: string) {
    return { __type: 'Pointer', className: User.className, objectId: id };
  }

  static query() {
    return new Query(User);
  }

  static async find(id: string): Promise<User> {
    const object = await new AV.Query<AV.Object>(User.className).get(id);
    return User.fromAVObject(object);
  }

  static async findBySessionToken(token: string): Promise<User> {
    const avUser = await userCache.get(token);
    return User.fromAVUser(avUser);
  }

  static async findByAnonymousID(id: string): Promise<User | undefined> {
    const AVUser = await anonymousUserCache.get(id);
    if (!AVUser) return undefined;
    return User.fromAVUser(AVUser);
  }

  static async isCustomerService(user: string | { id: string }): Promise<boolean> {
    const userId = typeof user === 'string' ? user : user.id;
    const role = await localCustomerServiceRole.get('');
    const query = role.getUsers().query();
    query.select('objectId');
    query.equalTo('objectId', userId);
    return !!(await query.first({ useMasterKey: true }));
  }

  static async getCustomerServices(): Promise<User[]> {
    const role = await localCustomerServiceRole.get('');
    const query = role.getUsers().query();
    const users = await query.find({ useMasterKey: true });
    return users.map(User.fromAVObject);
  }

  async isCustomerService(): Promise<boolean> {
    if (this._isCustomerService === undefined) {
      this._isCustomerService = await User.isCustomerService(this);
    }
    return this._isCustomerService;
  }
}
