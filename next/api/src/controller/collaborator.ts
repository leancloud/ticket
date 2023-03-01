import { z } from 'zod';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpError,
  Param,
  Post,
  ResponseBody,
  UseMiddlewares,
} from '@/common/http';
import { auth, customerServiceOnly } from '@/middleware';
import { ZodValidationPipe } from '@/common/pipe';
import { User } from '@/model/User';
import { collaboratorService } from '@/service/collaborator';
import { UserResponse } from '@/response/user';

const createCollaboratorSchema = z.object({
  userId: z.string(),
});

@Controller('collaborators')
@UseMiddlewares(auth, customerServiceOnly)
export class CollaboratorController {
  @Post()
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

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await collaboratorService.deleteCollaborator(id);
  }
}
