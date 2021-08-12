import Router from '@koa/router';

import { catchLCError, catchYupError } from '../middleware/error';
import ticket from './ticket';
import category from './category';
import group from './group';
import customerService from './customer-service';

const router = new Router({ prefix: '/api/2' }).use(catchYupError, catchLCError);

router.use('/tickets', ticket.routes());
router.use('/categories', category.routes());
router.use('/groups', group.routes());
router.use('/customer-services', customerService.routes());

export default router;
