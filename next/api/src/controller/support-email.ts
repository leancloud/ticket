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
import { auth, adminOnly } from '@/middleware';
import { ZodValidationPipe } from '@/common/pipe';
import { SupportEmailResponse } from '@/response/support-email';
import { SupportEmail } from '@/support-email/entities/SupportEmail';
import { supportEmailService } from '@/support-email/services/support-email';
import { emailService } from '@/support-email/services/email';

const noEmptyStringSchema = z.string().nonempty();

const emailServerSchema = z.object({
  host: noEmptyStringSchema,
  port: z.number().int().min(0).max(65535),
  secure: z.boolean(),
});

const createSchema = z.object({
  name: noEmptyStringSchema,
  email: noEmptyStringSchema,
  auth: z.object({
    username: noEmptyStringSchema,
    password: noEmptyStringSchema,
  }),
  smtp: emailServerSchema,
  imap: emailServerSchema,
  mailbox: z.string().optional(),
  categoryId: noEmptyStringSchema,
  receipt: z.object({
    enabled: z.boolean(),
    subject: noEmptyStringSchema,
    text: noEmptyStringSchema,
  }),
});

const updateSchema = createSchema
  .omit({
    mailbox: true,
  })
  .partial();

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
@UseMiddlewares(auth, adminOnly)
export class SupportEmailController {
  @Post()
  @ResponseBody(SupportEmailResponse)
  async create(@Body(new ZodValidationPipe(createSchema)) data: CreateData) {
    await this.checkEmailConflict(data.email);
    const mailbox = data.mailbox || 'INBOX';
    const client = await this.validateEmailAccount(data);
    try {
      const uidNext = await emailService.getUidNext(client, mailbox);
      const supportEmail = await SupportEmail.create(
        {
          ACL: {},
          name: data.name,
          email: data.email,
          auth: data.auth,
          smtp: data.smtp,
          imap: data.imap,
          mailbox: mailbox,
          categoryId: data.categoryId,
          receipt: data.receipt,
          lastUid: uidNext - 1,
        },
        { useMasterKey: true }
      );
      return supportEmail;
    } finally {
      await client.logout();
    }
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
    if (data.email && data.email !== supportEmail.email) {
      await this.checkEmailConflict(data.email);
    }
    const updated = await supportEmail.update(
      {
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
    return updated;
  }

  @Delete(':id')
  async delete(@Param('id', FindSupportEmailPipe) supportEmail: SupportEmail) {
    await supportEmail.delete({ useMasterKey: true });
  }

  async checkEmailConflict(email: string) {
    const emailConfilct = await supportEmailService.getSupportEmailByEmail(email);
    if (emailConfilct) {
      throw new HttpError(409, `Email ${email} already exists`);
    }
  }

  async validateEmailAccount(data: CreateData) {
    const client = emailService.createImapClient(data);
    try {
      await client.connect();
      return client;
    } catch (e: any) {
      const message = e.responseText || e.message;
      throw new HttpError(400, `Validate email account failed: ${message}`);
    }
  }
}
