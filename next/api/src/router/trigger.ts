import { Context } from 'koa';
import Router from '@koa/router';
import { z } from 'zod';

import { auth, customerServiceOnly } from '@/middleware/auth';
import { trigger as triggerFactory } from '@/ticket/automation';
import { Trigger } from '@/model/Trigger';
import { TriggerResponse } from '@/response/trigger';

const router = new Router().use(auth, customerServiceOnly);

const conditionsSchema = z.object({
  all: z.array(z.any()).default([]),
  any: z.array(z.any()).default([]),
});

const actionsSchema = z.array(z.any());

const createDataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  conditions: conditionsSchema,
  actions: actionsSchema,
});

function validate(ctx: Context, data: any): void | never {
  try {
    triggerFactory(data);
  } catch (error) {
    ctx.throw(400, (error as Error).message);
  }
}

router.post('/', async (ctx) => {
  const data = createDataSchema.parse(ctx.request.body);
  validate(ctx, data);

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

router.get('/', async (ctx) => {
  const triggers = await Trigger.query().find({ useMasterKey: true });
  ctx.body = triggers.map((t) => new TriggerResponse(t));
});

router.param('id', async (id, ctx, next) => {
  ctx.state.trigger = await Trigger.findOrFail(id, { useMasterKey: true });
  return next();
});

router.get('/:id', (ctx) => {
  ctx.body = new TriggerResponse(ctx.state.trigger);
});

const updateDataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  conditions: conditionsSchema.optional(),
  actions: actionsSchema.optional(),
  active: z.boolean().optional(),
});

router.patch('/:id', async (ctx) => {
  const trigger = ctx.state.trigger as Trigger;
  const data = updateDataSchema.parse(ctx.request.body);
  validate(ctx, data);

  await trigger.update(
    {
      title: data.title,
      description: data.description,
      conditions: data.conditions,
      actions: data.actions,
      active: data.active,
    },
    {
      useMasterKey: true,
    }
  );

  ctx.body = {};
});

router.delete('/:id', async (ctx) => {
  const trigger = ctx.state.trigger as Trigger;
  await trigger.delete({ useMasterKey: true });
  ctx.body = {};
});

export default router;
