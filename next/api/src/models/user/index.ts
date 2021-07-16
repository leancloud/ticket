import AV from 'leancloud-storage';

import { Pointer } from '../../utils/av';
import { getGravatarURL } from './utls';
import { isCustomerService } from './customer-service';

export interface UserData {
  id: string;
  username: string;
  name?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AuthedUser = User & Required<Pick<User, 'sessionToken'>>;

export class User {
  id: string;
  username: string;
  name?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
  avatar: string;
  sessionToken?: string;

  private _isCustomerService?: boolean;

  constructor(data: UserData) {
    this.id = data.id;
    this.username = data.username;
    this.name = data.name;
    this.email = data.email;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.avatar = getGravatarURL(this.email ?? this.username);
  }

  static pointer(id: string) {
    return Pointer('_User', id);
  }

  static fromAVObject(object: AV.Object): User {
    // TODO(sdjdd): check attributes
    return new User({
      id: object.id!,
      username: object.get('username'),
      name: object.get('name') ?? undefined,
      email: object.get('email') ?? undefined,
      createdAt: object.createdAt!,
      updatedAt: object.updatedAt!,
    });
  }

  static async get(id: string): Promise<User> {
    const query = new AV.Query<AV.Object>('_User');
    const object = await query.get(id, { useMasterKey: true });
    return User.fromAVObject(object);
  }

  static async getBySessionToken(token: string): Promise<AuthedUser> {
    const avUser = await AV.User.become(token);
    const user = User.fromAVObject(avUser);
    user.sessionToken = avUser.getSessionToken();
    return user as AuthedUser;
  }

  static async isCustomerService(id: string): Promise<boolean> {
    return isCustomerService(id);
  }

  async isCustomerService(): Promise<boolean> {
    if (this._isCustomerService === undefined) {
      this._isCustomerService = await User.isCustomerService(this.id);
    }
    return this._isCustomerService;
  }

  isCustomerServiceSync(): boolean | never {
    if (this._isCustomerService === undefined) {
      throw new Error('You should call User#isCustomerService first');
    }
    return this._isCustomerService;
  }

  toPointer() {
    return AV.Object.createWithoutData('_User', this.id);
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      name: this.name,
      avatar: this.avatar,
    };
  }
}

export default User;
