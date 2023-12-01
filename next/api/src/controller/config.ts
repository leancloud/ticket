import { z } from 'zod';

import { BadRequestError, Body, Controller, Get, Param, Put, UseMiddlewares } from '@/common/http';
import { Config } from '@/config';
import { auth, customerServiceOnly } from '@/middleware';

const evaluationTagSchema = z.object({
  options: z.array(z.string()),
  required: z.boolean(),
});

const CONFIG_SCHEMAS: Record<string, z.Schema<any>> = {
  weekday: z.array(z.number()),
  work_time: z.object({
    from: z.object({
      hours: z.number(),
      minutes: z.number(),
      seconds: z.number(),
    }),
    to: z.object({
      hours: z.number(),
      minutes: z.number(),
      seconds: z.number(),
    }),
  }),
  evaluation: z.object({
    timeLimit: z.number().int().min(0),
    tag: z
      .object({
        positive: evaluationTagSchema,
        negative: evaluationTagSchema,
      })
      .partial()
      .optional(),
  }),
};

@Controller('config')
@UseMiddlewares(auth, customerServiceOnly)
export class ConfigController {
  @Get(':key')
  getEvaluation(@Param('key') key: string) {
    if (!(key in CONFIG_SCHEMAS)) {
      throw new BadRequestError(`Invalid config key "${key}"`);
    }
    return Config.get(key);
  }

  @Put(':key')
  async setEvaluation(@Param('key') key: string, @Body() body: any) {
    const schema = CONFIG_SCHEMAS[key];
    if (!schema) {
      throw new BadRequestError(`Invalid config key "${key}"`);
    }
    const data = schema.parse(body);
    await Config.set(key, data);
  }
}
