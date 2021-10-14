import Router from '@koa/router';
import { z } from 'zod';

import { auth, customerServiceOnly } from '@/middleware/auth';
import { trigger as triggerFactory } from '@/ticket/automation';
import { Trigger } from '@/model/Trigger';
import { TriggerResponse } from '@/response/trigger';

const router = new Router().use(auth, customerServiceOnly);

const createDataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  conditions: z.object({
    all: z.array(z.any()).default([]),
    any: z.array(z.any()).default([]),
  }),
  actions: z.array(z.any()),
});

router.post('/', async (ctx) => {
  const data = createDataSchema.parse(ctx.request.body);

  console.dir(data, { depth: 114514 });
  try {
    triggerFactory(data);
  } catch (error) {
    ctx.throw(400, (error as Error).message);
  }

  const trigger = await Trigger.create(
    {
      ACL: {},
      title: data.title,
      description: data.description,
      conditions: data.conditions,
      actions: data.actions,
      active: true,
    },
    {
      useMasterKey: true,
    }
  );

  ctx.body = { id: trigger.id };
});

export default router;
