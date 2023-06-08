import { Context } from 'koa';
import Router from '@koa/router';
import { ZodError, z } from 'zod';
import _ from 'lodash';

import { getZodErrorMessage } from '@/utils/zod';
import { auth, adminOnly } from '@/middleware/auth';
import { TimeTrigger } from '@/model/TimeTrigger';
import { TimeTriggerResponse } from '@/response/time-trigger';
import { condition } from '@/ticket/automation/time-trigger/condition';
import { action } from '@/ticket/automation/time-trigger/action';

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

  const timeTrigger = await TimeTrigger.create(
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
    id: timeTrigger.id,
  };
});

router.get('/', async (ctx) => {
  const timeTrigger = await TimeTrigger.query().find({ useMasterKey: true });
  ctx.body = timeTrigger.map((a) => new TimeTriggerResponse(a));
});

router.param('id', async (id, ctx, next) => {
  ctx.state.timeTrigger = await TimeTrigger.findOrFail(id, { useMasterKey: true });
  return next();
});

router.get('/:id', (ctx) => {
  ctx.body = new TimeTriggerResponse(ctx.state.timeTrigger);
});

const updateDataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  conditions: conditionsSchema.optional(),
  actions: actionsSchema.optional(),
  active: z.boolean().optional(),
});

router.patch('/:id', async (ctx) => {
  const timeTrigger = ctx.state.timeTrigger as TimeTrigger;
  const data = updateDataSchema.parse(ctx.request.body);

  if (data.conditions) {
    validateConditions(ctx, data.conditions);
  }
  if (data.actions) {
    validateActions(ctx, data.actions);
  }

  await timeTrigger.update(
    {
      title: data.title,
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
  const timeTrigger = ctx.state.timeTrigger as TimeTrigger;
  await timeTrigger.delete({ useMasterKey: true });
  ctx.body = {};
});

const reorderDataSchema = z.object({
  ids: z.array(z.string()),
});

async function reorderTimeTriggers(ids: string[]) {
  const timeTriggers = await TimeTrigger.query().find({ useMasterKey: true });
  const timeTriggerMap = _.keyBy(timeTriggers, 'id');

  const ordered: TimeTrigger[] = [];
  ids.forEach((id) => {
    const timeTrigger = timeTriggerMap[id];
    if (timeTrigger) {
      ordered.push(timeTrigger);
      delete timeTriggerMap[id];
    }
  });
  const rest = Object.values(timeTriggerMap);

  const data = [
    ...ordered.map((a, i) => [a, { position: i }]),
    ...rest.map((a) => [a, { position: null }]),
  ] as [TimeTrigger, { position: number | null }][];
  await TimeTrigger.updateSome(data, { useMasterKey: true });
}

router.post('/reorder', async (ctx) => {
  const { ids } = reorderDataSchema.parse(ctx.request.body);
  if (ids.length) {
    await reorderTimeTriggers(ids);
  }
  ctx.body = {};
});

export default router;
