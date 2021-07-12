import Router from '@koa/router';

import { catchYupError } from '../middlewares/yup';
import ticket from './ticket';

const router = new Router({ prefix: '/api/2' }).use(catchYupError);

router.use(ticket.routes());

export default router;
