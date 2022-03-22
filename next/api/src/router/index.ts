import Router from '@koa/router';

import { getControllers, applyController } from '@/common/http';
import '@/controller';
import { catchLCError, catchYupError, catchZodError } from '@/middleware/error';
import ticket from './ticket';
import organization from './organization';
import unread from './unread';
import notification from './notification';
import ticketForm from './ticket-form';
import article from './article';
import trigger from './trigger';
import timeTrigger from './time-trigger';
import reply from './reply';
import ticketStats from './ticket-stats';
import config from './config';

const router = new Router({ prefix: '/api/2' }).use(catchYupError, catchLCError, catchZodError);

router.use('/tickets', ticket.routes());
router.use('/organizations', organization.routes());
router.use('/unread', unread.routes());
router.use('/notifications', notification.routes());
router.use('/ticket-forms', ticketForm.routes());
router.use('/articles', article.routes());
router.use('/triggers', trigger.routes());
router.use('/time-triggers', timeTrigger.routes());
router.use('/replies', reply.routes());
router.use('/ticket-stats', ticketStats.routes());
router.use('/config', config.routes());

getControllers().forEach((controller) => {
  applyController(router, controller);
});

export default router;
