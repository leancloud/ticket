import AV from 'leancloud-storage';

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

  constructor(data: UserData);
  constructor(avUser: AV.User);
  constructor(user: UserData | AV.User) {
    if (user instanceof AV.User) {
      if (!user.id) {
        throw new Error('Cannot construct user by an unsaved AV.User');
      }
      this.id = user.id;

      if (!user.has('username')) {
        throw new Error('Cannot construct user by AV.User without username');
      }
      this.username = user.getUsername();

      if (!user.createdAt || !user.updatedAt) {
        throw new Error(
          'Cannot construct user by AV.User without createdAt or updatedAt'
        );
      }
      this.createdAt = user.createdAt;
      this.updatedAt = user.updatedAt;

      this.name = user.get('name');
    } else {
      this.id = user.id;
      this.username = user.username;
      this.name = user.name;
      this.createdAt = user.createdAt;
      this.updatedAt = user.updatedAt;
    }
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
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

  constructor(data: LoggedInUserData);
  constructor(avUser: AV.User);
  constructor(user: LoggedInUserData | AV.User) {
    if (user instanceof AV.User) {
      super(user);
      if (!user.getSessionToken()) {
        throw new Error(
          'Cannot construct LoggedInUser by AV.User without sessionToken'
        );
      }
      this.sessionToken = user.getSessionToken();
    } else {
      super(user);
      this.sessionToken = user.sessionToken;
    }
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
