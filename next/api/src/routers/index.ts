import Router from '@koa/router';

import { catchYupError } from '../middlewares/yup';
import ticket from './ticket';
import category from './category';

const router = new Router({ prefix: '/api/2' }).use(catchYupError);

router.use('/tickets', ticket.routes());
router.use('/categories', category.routes());

export default router;
