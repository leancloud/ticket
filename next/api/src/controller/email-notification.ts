import { z } from 'zod';

import { Body, Controller, Delete, Get, Put, UseMiddlewares } from '@/common/http';
import { ZodValidationPipe } from '@/common/pipe';
import { adminOnly, auth } from '@/middleware';
import { emailNotificationService } from '@/service/email-notification';
import { EmailNotificationResponse } from '@/response/email-notification';

const SmtpSchema = z.object({
  host: z.string(),
  port: z.number().int().positive(),
  secure: z.boolean(),
  username: z.string(),
  password: z.string().optional(),
});

const MessageSchema = z.object({
  text: z.string().optional(),
  html: z.string().optional(),
});

const EventSchema = z.object({
  type: z.enum(['ticketRepliedByCustomerService']),
  from: z.string().optional(),
  to: z.string(),
  subject: z.string(),
  message: MessageSchema,
});

const SetEmailNotificationSchema = z.object({
  send: z.object({
    smtp: SmtpSchema,
  }),
  events: z.array(EventSchema).default([]),
});

@Controller('email-notification')
@UseMiddlewares(auth, adminOnly)
export class EmailNotificationController {
  @Put()
  async set(
    @Body(new ZodValidationPipe(SetEmailNotificationSchema))
    data: z.infer<typeof SetEmailNotificationSchema>
  ) {
    await emailNotificationService.set(data);
  }

  @Get()
  async get() {
    const value = await emailNotificationService.get(false);
    if (value) {
      return new EmailNotificationResponse(value);
    }
    return null;
  }

  @Delete()
  async remove() {
    await emailNotificationService.remove();
  }
}
