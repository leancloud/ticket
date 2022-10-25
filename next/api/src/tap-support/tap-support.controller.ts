import { Controller, CurrentUser, Post, UseMiddlewares } from '@/common/http';
import { auth, customerServiceOnly } from '@/middleware';
import { User } from '@/model/User';
import service from './tap-support.service';

@Controller('tap-support')
@UseMiddlewares(auth, customerServiceOnly)
export class TapSupportController {
  private shortAppId: string;

  constructor() {
    const appId = process.env.LEANCLOUD_APP_ID;
    if (!appId) {
      throw new Error('missing env "LEANCLOUD_APP_ID"');
    }
    this.shortAppId = appId.slice(0, 8).toLowerCase();
  }

  @Post('auth-tokens')
  async createAuthToken(@CurrentUser() currentUser: User) {
    const token = service.createAuthJwt({
      customId: `${this.shortAppId}_${currentUser.id}`,
      customUsername: currentUser.name || currentUser.username,
    });
    return {
      token,
    };
  }
}
