import crypto from 'node:crypto';
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
    return User.create(
      {
        username: data.username,
        password: data.password,
        name: data.name,
        email: data.email,
      },
      { useMasterKey: true }
    );
  }

  async getOrCreateUserByEmailAndName(email: string, name: string) {
    const user = await this.getUserByEmail(email);
    if (user) {
      return user;
    }
    return this.createUser({
      username: email,
      password: this.generatePassword(16),
      name,
      email,
    });
  }

  /**
   * Created by ChatGPT
   */
  generatePassword(length: number) {
    // Define the character set that the password will use
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    // Create a buffer to store the random bytes
    const buf = crypto.randomBytes(length);

    // Create an empty string to store the password
    let password = '';

    // Loop through each byte in the buffer and use it to select a character from the character set
    for (let i = 0; i < length; i++) {
      const randomByte = buf[i];
      const randomIndex = randomByte % charset.length;
      const randomChar = charset[randomIndex];
      password += randomChar;
    }

    return password;
  }
}

export const userService = new UserService();
