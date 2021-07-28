import Router from '@koa/router';

import { catchLCError, catchYupError } from '../middlewares/error';
import ticket from './ticket';
import category from './category';
import staff from './staff';
import ticketField from './ticketField';
import ticketForm from './ticketForm';

const router = new Router({ prefix: '/api/2' }).use(catchYupError, catchLCError);

router.use('/tickets', ticket.routes());
router.use('/categories', category.routes());
router.use('/staffs', staff.routes());
router.use('/ticket-fields', ticketField.routes());
router.use('/ticket-forms', ticketForm.routes());
export default router;
