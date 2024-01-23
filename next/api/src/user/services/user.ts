import crypto from 'node:crypto';

import { BadRequestError } from '@/common/http';
import { User } from '@/model/User';
import { MergeUserTask } from '@/model/MergeUserTask';
import { ticketService } from '@/service/ticket';
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

  async inactiveUser(user: User) {
    const newUser = await user.update({ inactive: true }, { useMasterKey: true });
    await user.refreshSessionToken();
    return newUser;
  }

  async mergeUser(sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      throw new BadRequestError('源用户和目标用户不能相同');
    }

    const sourceUser = await User.find(sourceId, { useMasterKey: true });
    if (!sourceUser) {
      throw new BadRequestError('源用户不存在');
    }
    const sourceUserTask = await MergeUserTask.queryBuilder()
      .where('sourceUser', '==', sourceUser.toPointer())
      .first({ useMasterKey: true });
    if (sourceUserTask) {
      throw new BadRequestError('源用户已被合并');
    }

    const targetUser = await User.find(targetId, { useMasterKey: true });
    if (!targetUser) {
      throw new BadRequestError('目标用户不存在');
    }

    if (sourceUser.authData && targetUser.authData) {
      throw new BadRequestError('authData conflict');
    }
    if (sourceUser.email && targetUser.email) {
      throw new BadRequestError('email confilct');
    }

    const task = await MergeUserTask.create(
      {
        sourceUserId: sourceUser.id,
        targetUserId: targetUser.id,
        mergingData: {
          authData: sourceUser.authData,
          email: sourceUser.email,
        },
        status: 'pending',
      },
      { useMasterKey: true }
    );

    (async () => {
      await this.inactiveUser(sourceUser);
      if (sourceUser.email || sourceUser.authData) {
        await sourceUser.update(
          {
            authData: null,
            email: null,
          },
          { useMasterKey: true }
        );
      }

      if (task.mergingData.email || task.mergingData.authData) {
        await targetUser.update(
          {
            authData: task.mergingData.authData,
            email: task.mergingData.email,
          },
          { useMasterKey: true }
        );
      }

      await ticketService.addTransferTicketJob({
        sourceUserId: sourceUser.id,
        targetUserId: targetUser.id,
        mergeUserTaskId: task.id,
      });

      await task.update({ status: 'transfer_tickets' }, { useMasterKey: true });
    })();

    return task;
  }

  async transferTicketsCallback(mergeUserTaskId: string) {
    const task = await MergeUserTask.find(mergeUserTaskId, { useMasterKey: true });
    if (task) {
      await task.update(
        {
          status: 'complete',
          completedAt: new Date(),
        },
        {
          useMasterKey: true,
        }
      );
    }
  }
}

export const userService = new UserService();
