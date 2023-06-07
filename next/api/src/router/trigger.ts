import { Context } from 'koa';
import Router from '@koa/router';
import { ZodError, z } from 'zod';
import _ from 'lodash';

import { getZodErrorMessage } from '@/utils/zod';
import { auth, adminOnly } from '@/middleware/auth';
import { Trigger } from '@/model/Trigger';
import { TriggerResponse } from '@/response/trigger';
import { condition } from '@/ticket/automation/trigger/condition';
import { action } from '@/ticket/automation/trigger/action';

const router = new Router().use(auth, adminOnly);

function getErrorMessage(error: Error) {
  if (error instanceof ZodError) {
    return getZodErrorMessage(error);
  }
  return error.message;
}

function validateConditions(ctx: Context, data: unknown): void | never {
  try {
    condition(data);
  } catch (error) {
    ctx.throw(400, getErrorMessage(error as Error));
  }
}

function validateActions(ctx: Context, data: unknown[]): void | never {
  data.forEach((item, i) => {
    try {
      action(item);
    } catch (error) {
      ctx.throw(400, `actions.${i}: ` + getErrorMessage(error as Error));
    }
  });
}

const conditionsSchema = z
  .object({
    type: z.string(),
  })
  .passthrough();

const actionsSchema = z.array(
  z
    .object({
      type: z.string(),
    })
    .passthrough()
);

const createDataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  conditions: conditionsSchema,
  actions: actionsSchema,
});

router.post('/', async (ctx) => {
  const data = createDataSchema.parse(ctx.request.body);
  validateConditions(ctx, data.conditions);
  validateActions(ctx, data.actions);

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

  ctx.body = {
    id: trigger.id,
  };
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

  if (data.conditions) {
    validateConditions(ctx, data.conditions);
  }
  if (data.actions) {
    validateActions(ctx, data.actions);
  }

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

const reorderDataSchema = z.object({
  ids: z.array(z.string()),
});

router.post('/reorder', async (ctx) => {
  const { ids } = reorderDataSchema.parse(ctx.request.body);
  if (ids.length) {
    const triggers = await Trigger.query().find({ useMasterKey: true });
    const triggerMap = _.keyBy(triggers, 'id');

    const front: Trigger[] = [];
    ids.forEach((id) => {
      if (id in triggerMap) {
        front.push(triggerMap[id]);
        delete triggerMap[id];
      }
    });
    const tail = Object.values(triggerMap);

    await Trigger.updateSome(
      [
        ...front.map((t, i) => [t, { position: i }]),
        ...tail.map((t) => [t, { position: null }]),
      ] as [Trigger, { position: number | null }][],
      {
        useMasterKey: true,
      }
    );
  }
  ctx.body = {};
});

export default router;
