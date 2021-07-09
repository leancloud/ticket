import AV from 'leancloud-storage';

import {
  assertAVObjectHasAttributes,
  assertAVObjectHasBeenSaved,
  assertAVObjectHasTimestamps,
} from '../utils/av';

export interface UserData {
  id: string;
  username: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  readonly id: string;
  readonly username: string;
  readonly name?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(user: UserData) {
    this.id = user.id;
    this.username = user.username;
    this.name = user.name;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }

  static fromAVObject(object: AV.User): User {
    assertAVObjectHasBeenSaved(object);
    assertAVObjectHasAttributes(object, 'username');
    assertAVObjectHasTimestamps(object);
    return new User({
      id: object.id,
      username: object.getUsername(),
      name: object.get('name'),
      createdAt: object.createdAt,
      updatedAt: object.updatedAt,
    });
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      name: this.name,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}

export interface LoggedInUserData extends UserData {
  sessionToken: string;
}

export class LoggedInUser extends User {
  readonly sessionToken: string;

  constructor(user: LoggedInUserData) {
    super(user);
    this.sessionToken = user.sessionToken;
  }

  static async getBySessionToken(sessionToken: string): Promise<LoggedInUser> {
    const avUser = await AV.User.become(sessionToken);
    return new LoggedInUser({
      sessionToken,
      id: avUser.id!,
      username: avUser.getUsername(),
      name: avUser.get('name') ?? undefined,
      createdAt: avUser.createdAt!,
      updatedAt: avUser.updatedAt!,
    });
  }

  getAuthOptions(): AV.AuthOptions {
    return {
      useMasterKey: this === SYSTEM_USER,
      sessionToken: this.sessionToken,
    };
  }
}

export const SYSTEM_USER = new LoggedInUser({
  id: 'system',
  username: 'system',
  sessionToken: 'system',
  createdAt: new Date(0),
  updatedAt: new Date(0),
});
