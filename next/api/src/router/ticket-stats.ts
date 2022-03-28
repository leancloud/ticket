import Router from '@koa/router';
import * as yup from '@/utils/yup';
import { auth, customerServiceOnly } from '@/middleware';
import { TicketStats } from '@/model/TicketStats';
import { CategoryService } from '@/service/category';
import { TicketStatusStats } from '@/model/TicketStatusStats';
import { TicketStatusStatsResponse } from '@/response/ticket-stats';
const router = new Router().use(auth, customerServiceOnly);

const statsSchema = yup.object({
  from: yup.date().required(),
  to: yup.date().required(),
  category: yup.string().optional(),
  customerService: yup.string().optional(),
});

const getCategoryIds = (categoryId?: string) => {
  if (!categoryId) {
    return;
  }
  return CategoryService.getSubCategories(categoryId).then(categories => {
    return categories.length === 0 ? [categoryId] : categories.map(v => v.id)
  })
}

router.get('/',
  async (ctx) => {
    const { category, customerService, ...rest } = statsSchema.validateSync(ctx.query);
    const categoryIds = await getCategoryIds(category)
    const data = await TicketStats.fetchTicketStats({
      ...rest,
      customerServiceId: customerService,
      categoryIds
    })
    ctx.body = data || {};
  }
);


const fieldStatsSchema = yup.object({
  from: yup.date().required(),
  to: yup.date().required(),
  category: yup.string().optional(),
  customerService: yup.string().optional(),
  fields: yup.string().required(),
});
router.get('/fields', async (ctx) => {
  const { category, customerService, fields, ...rest } = fieldStatsSchema.validateSync(ctx.query);
  const categoryIds = category === '*' ? '*' : await getCategoryIds(category)
  const data = await TicketStats.fetchTicketFieldStats({
    ...rest,
    customerServiceId: customerService,
    categoryIds,
    fields: fields.split(',')
  })
  ctx.body = data;
})

const statusSchema = yup.object({
  from: yup.date().required(),
  to: yup.date().required()
});
router.get('/status', async (ctx) => {
  const { from, to } = statusSchema.validateSync(ctx.query);
  const data = await TicketStatusStats.fetchTicketStatus({
    from,
    to
  })
  ctx.body = data.map(value => new TicketStatusStatsResponse(value));
})

export default router;
