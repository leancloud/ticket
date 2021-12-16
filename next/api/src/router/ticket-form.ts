import Router from '@koa/router';
import { z } from 'zod';
import _ from 'lodash';

import { auth, customerServiceOnly, pagination, sort } from '@/middleware';
import { TicketForm } from '@/model/TicketForm';
import { TicketFormResponse } from '@/response/ticket-form';
import { TicketField } from '@/model/TicketField';
import { Category } from '@/model/Category';

const router = new Router().use(auth);

router.get('/', pagination(), sort('orderBy', ['updatedAt']), async (ctx) => {
  const { page, pageSize } = pagination.get(ctx);
  const sortItems = sort.get(ctx);

  const query = TicketForm.queryBuilder()
    .skip((page - 1) * pageSize)
    .limit(pageSize);

  sortItems?.forEach(({ key, order }) => query.orderBy(key, order));

  const forms = ctx.query.count
    ? await query.findAndCount({ useMasterKey: true }).then(([data, count]) => {
        ctx.set('x-total-count', count.toString());
        return data;
      })
    : await query.find({ useMasterKey: true });

  ctx.body = forms.map((form) => new TicketFormResponse(form));
});

const createFormDataSchema = z.object({
  title: z.string().min(1),
  fieldIds: z.array(z.string()).min(1),
});

router.post('/', customerServiceOnly, async (ctx) => {
  const { title, fieldIds } = createFormDataSchema.parse(ctx.request.body);

  const fields = await TicketField.queryBuilder()
    .where('objectId', 'in', fieldIds)
    .find({ useMasterKey: true });
  const missingIds = _.difference(
    fieldIds,
    fields.map((f) => f.id)
  );
  if (missingIds.length) {
    ctx.throw(400, `TicketField ${missingIds[0]} is not exists`);
  }

  const form = await TicketForm.create({ title, fieldIds });

  ctx.body = { id: form.id };
});

router.param('id', async (id, ctx, next) => {
  const form = await TicketForm.find(id, { useMasterKey: true });
  if (!form) {
    ctx.throw(404, `TicketForm ${id} is not exists`);
  }
  ctx.state.form = form;
  return next();
});

router.get('/:id', (ctx) => {
  const form = ctx.state.form as TicketForm;
  ctx.body = new TicketFormResponse(form);
});

const updateFormDataSchema = z.object({
  title: z.string().min(1).optional(),
  fieldIds: z.array(z.string()).min(1).optional(),
});

router.patch('/:id', customerServiceOnly, async (ctx) => {
  const form = ctx.state.form as TicketForm;
  const data = updateFormDataSchema.parse(ctx);

  if (data.fieldIds) {
    const fields = await TicketField.queryBuilder()
      .where('objectId', 'in', data.fieldIds)
      .find({ useMasterKey: true });
    const missingIds = _.difference(
      data.fieldIds,
      fields.map((f) => f.id)
    );
    if (missingIds.length) {
      ctx.throw(400, `TicketField ${missingIds[0]} is not exists`);
    }
  }

  await form.update(data);
  ctx.body = {};
});

router.delete('/:id', customerServiceOnly, async (ctx) => {
  const form = ctx.state.form as TicketForm;

  const categories = await Category.queryBuilder().where('form', '==', form.toPointer()).find();
  if (categories.length) {
    ctx.throw(409, `TicketForm ${form.id} is being used by some categories`);
  }

  await form.delete({ useMasterKey: true });

  ctx.body = {};
});

export default router;
