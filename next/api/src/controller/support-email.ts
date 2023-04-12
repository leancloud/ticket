import { z } from 'zod';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpError,
  Param,
  Patch,
  Post,
  ResponseBody,
  UseMiddlewares,
} from '@/common/http';
import { auth, customerServiceOnly } from '@/middleware';
import { ZodValidationPipe } from '@/common/pipe';
import { SupportEmailResponse } from '@/response/support-email';
import { SupportEmail } from '@/support-email/entities/SupportEmail';
import { supportEmailService } from '@/support-email/services/support-email';

const emailServerSchema = z.object({
  host: z.string(),
  port: z.number().int().min(0).max(65535),
  secure: z.boolean(),
});

const createSchema = z.object({
  name: z.string(),
  email: z.string(),
  auth: z.object({
    username: z.string(),
    password: z.string(),
  }),
  smtp: emailServerSchema,
  imap: emailServerSchema,
  categoryId: z.string(),
  receipt: z.object({
    enabled: z.boolean(),
    subject: z.string(),
    text: z.string(),
  }),
});

const updateSchema = createSchema.partial();

type CreateData = z.infer<typeof createSchema>;
type UpdateData = z.infer<typeof updateSchema>;

class FindSupportEmailPipe {
  static async transform(id: string) {
    const supportEmail = await SupportEmail.find(id, { useMasterKey: true });
    if (!supportEmail) {
      throw new HttpError(404, `Support email ${id} does not exist`);
    }
    return supportEmail;
  }
}

@Controller('support-emails')
@UseMiddlewares(auth, customerServiceOnly)
export class SupportEmailController {
  @Post()
  @ResponseBody(SupportEmailResponse)
  async create(@Body(new ZodValidationPipe(createSchema)) data: CreateData) {
    const emailConfilct = await supportEmailService.getSupportEmailByEmail(data.email);
    if (emailConfilct) {
      throw new HttpError(409, `Email ${data.email} already exist`);
    }
    const supportEmail = await SupportEmail.create(
      {
        ACL: {},
        name: data.name,
        email: data.email,
        auth: data.auth,
        smtp: data.smtp,
        imap: data.imap,
        categoryId: data.categoryId,
        receipt: data.receipt,
      },
      { useMasterKey: true }
    );
    return supportEmail;
  }

  @Get()
  @ResponseBody(SupportEmailResponse)
  async list() {
    const supportEmails = await SupportEmail.queryBuilder().find({ useMasterKey: true });
    return supportEmails;
  }

  @Get(':id')
  @ResponseBody(SupportEmailResponse)
  get(@Param('id', FindSupportEmailPipe) supportEmail: SupportEmail) {
    return supportEmail;
  }

  @Patch(':id')
  @ResponseBody(SupportEmailResponse)
  async update(
    @Param('id', FindSupportEmailPipe) supportEmail: SupportEmail,
    @Body(new ZodValidationPipe(updateSchema)) data: UpdateData
  ) {
    const updated = await supportEmail.update(data, { useMasterKey: true });
    return updated;
  }

  @Delete(':id')
  async delete(@Param('id', FindSupportEmailPipe) supportEmail: SupportEmail) {
    await supportEmail.delete({ useMasterKey: true });
  }
}
