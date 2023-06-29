import Router from '@koa/router';

import { initControllers } from '@/common/http';
import '@/controller';
import { catchLCError, catchYupError, catchZodError } from '@/middleware/error';
import organization from './organization';
import unread from './unread';
import notification from './notification';
import article from './article';
import trigger from './trigger';
import timeTrigger from './time-trigger';
import reply from './reply';
import ticketStats from './ticket-stats';
import config from './config';

const router = new Router({ prefix: '/api/2' }).use(catchYupError, catchLCError, catchZodError);

router.use('/organizations', organization.routes());
router.use('/unread', unread.routes());
router.use('/notifications', notification.routes());
router.use('/articles', article.routes());
router.use('/triggers', trigger.routes());
router.use('/time-triggers', timeTrigger.routes());
router.use('/replies', reply.routes());
router.use('/ticket-stats', ticketStats.routes());
router.use('/config', config.routes());

initControllers(router);

export default router;
