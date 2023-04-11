import { User } from '@/model/User';
import { CreateUserData } from '../types';

export class UserService {
  getUser(id: string) {
    return User.find(id, { useMasterKey: true });
  }

  getUserByEmail(email: string) {
    return User.queryBuilder().where('email', '==', email).first({ useMasterKey: true });
  }

  createUser(data: CreateUserData) {
    return User.create({
      username: data.username,
      name: data.name,
      email: data.email,
    });
  }

  async getOrCreateUserByEmailAndName(email: string, name: string) {
    const user = await this.getUserByEmail(email);
    if (user) {
      return user;
    }
    return this.createUser({ username: email, name, email });
  }
}

export const userService = new UserService();
