import { z } from 'zod';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpError,
  Param,
  Post,
  Put,
  ResponseBody,
  UseMiddlewares,
} from '@/common/http';
import { auth, adminOnly, systemRoleMemberGuard } from '@/middleware';
import { ZodValidationPipe } from '@/common/pipe';
import { User } from '@/model/User';
import { collaboratorService } from '@/service/collaborator';
import { UserResponse } from '@/response/user';

const createCollaboratorSchema = z.object({
  userId: z.string(),
});

const privilegesSchema = z
  .object({
    createPublicReply: z.boolean(),
  })
  .partial();

@Controller('collaborators')
@UseMiddlewares(auth, systemRoleMemberGuard)
export class CollaboratorController {
  @Post()
  @UseMiddlewares(adminOnly)
  async create(
    @Body(new ZodValidationPipe(createCollaboratorSchema))
    data: z.infer<typeof createCollaboratorSchema>
  ) {
    const user = await User.find(data.userId, { useMasterKey: true });
    if (!user) {
      throw new HttpError(400, `User ${data.userId} does not exist`);
    }
    await collaboratorService.createCollaborator(user.id);
  }

  @Get()
  @ResponseBody(UserResponse)
  list() {
    return collaboratorService.getCollaborators();
  }

  @UseMiddlewares(adminOnly)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await collaboratorService.deleteCollaborator(id);
  }

  @UseMiddlewares(adminOnly)
  @Put('privileges')
  async setPrivileges(
    @Body(new ZodValidationPipe(privilegesSchema))
    data: z.infer<typeof privilegesSchema>
  ) {
    const config = await collaboratorService.setPrivileges(data);
    return config.value;
  }

  @Get('privileges')
  async getPrivileges() {
    const privileges = await collaboratorService.getPrivileges(false);
    return privileges || {};
  }
}
