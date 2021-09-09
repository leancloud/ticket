import AV from 'leancloud-storage';

import { Model, field } from '../orm';

export class User extends Model {
  static readonly className = '_User';

  static readonly avObjectConstructor = AV.User;

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

  static async findBySessionToken(sessionToken: string): Promise<User> {
    const avUser = await AV.User.become(sessionToken);
    return this.fromAVObject(avUser);
  }
}
