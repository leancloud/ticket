import { sign } from 'jsonwebtoken';

import { Controller, CurrentUser, HttpError, Post, UseMiddlewares } from '@/common/http';
import { auth, customerServiceOnly } from '@/middleware';
import { User } from '@/model/User';
import { roleService } from '@/service/role';

@Controller('leanchat')
@UseMiddlewares(auth, customerServiceOnly)
export class LeanChatController {
  private jwtSecret?: string;

  constructor() {
    this.jwtSecret = process.env.LEANCHAT_LOGIN_JWT_SECRET;
  }

  @Post('login-token')
  async createLoginToken(@CurrentUser() user: User) {
    if (!this.jwtSecret) {
      throw new HttpError(400, 'LeanChat JWT token is not configured');
    }

    const roles = await roleService.getSystemRolesForUser(user.id);
    const chatRole = roles.includes('admin') ? 2 : 1;
    const chatName = `客服${user.id.slice(-4)}`;
    const token = sign(
      {
        role: chatRole,
        username: `${user.username}_ticket`,
        externalName: chatName,
        internalName: user.name ?? chatName,
        concurrency: 5,
      },
      this.jwtSecret
    );

    return { token };
  }
}
