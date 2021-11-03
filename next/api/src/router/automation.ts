import { Context } from 'koa';
import Router from '@koa/router';
import { ZodError, z } from 'zod';
import _ from 'lodash';

import { getZodErrorMessage } from '@/utils/zod';
import { auth, customerServiceOnly } from '@/middleware/auth';
import { Automation } from '@/model/Automation';
import { AutomationResponse } from '@/response/automation';
import { condition } from '@/ticket/automation/time-trigger/condition';
import { action } from '@/ticket/automation/time-trigger/action';

const router = new Router().use(auth, customerServiceOnly);

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

  const automation = await Automation.create(
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
    id: automation.id,
  };
});

router.get('/', async (ctx) => {
  const automations = await Automation.query().find({ useMasterKey: true });
  ctx.body = automations.map((a) => new AutomationResponse(a));
});

router.param('id', async (id, ctx, next) => {
  ctx.state.automation = await Automation.findOrFail(id, { useMasterKey: true });
  return next();
});

router.get('/:id', (ctx) => {
  ctx.body = new AutomationResponse(ctx.state.automation);
});

const updateDataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  conditions: conditionsSchema.optional(),
  actions: actionsSchema.optional(),
  active: z.boolean().optional(),
});

router.patch('/:id', async (ctx) => {
  const automation = ctx.state.automation as Automation;
  const data = updateDataSchema.parse(ctx.request.body);

  if (data.conditions) {
    validateConditions(ctx, data.conditions);
  }
  if (data.actions) {
    validateActions(ctx, data.actions);
  }

  await automation.update(
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
  const automation = ctx.state.automation as Automation;
  await automation.delete({ useMasterKey: true });
  ctx.body = {};
});

const reorderDataSchema = z.object({
  ids: z.array(z.string()),
});

async function reorderAutomations(ids: string[]) {
  const automations = await Automation.query().find({ useMasterKey: true });
  const automationMap = _.keyBy(automations, 'id');

  const ordered: Automation[] = [];
  ids.forEach((id) => {
    const automation = automationMap[id];
    if (automation) {
      ordered.push(automation);
      delete automationMap[id];
    }
  });
  const rest = Object.values(automationMap);

  const data = [
    ...ordered.map((a, i) => [a, { position: i }]),
    ...rest.map((a) => [a, { position: null }]),
  ] as [Automation, { position: number | null }][];
  await Automation.updateSome(data, { useMasterKey: true });
}

router.post('/reorder', async (ctx) => {
  const { ids } = reorderDataSchema.parse(ctx.request.body);
  if (ids.length) {
    await reorderAutomations(ids);
  }
  ctx.body = {};
});

export default router;
