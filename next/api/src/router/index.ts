import Router from '@koa/router';

import { getControllers, applyController } from '@/common';
import '@/controller';
import { catchLCError, catchYupError, catchZodError } from '@/middleware/error';
import ticket from './ticket';
import category from './category';
import organization from './organization';
import group from './group';
import customerService from './customer-service';
import unread from './unread';
import notification from './notification';
import ticketField from './ticket-field';
import ticketForm from './ticket-form';
import ticketFilter from './ticket-filter';
import article from './article';
import trigger from './trigger';
import timeTrigger from './time-trigger';
import reply from './reply';

const router = new Router({ prefix: '/api/2' }).use(catchYupError, catchLCError, catchZodError);

router.use('/tickets', ticket.routes());
router.use('/categories', category.routes());
router.use('/organizations', organization.routes());
router.use('/groups', group.routes());
router.use('/customer-services', customerService.routes());
router.use('/unread', unread.routes());
router.use('/notifications', notification.routes());
router.use('/ticket-fields', ticketField.routes());
router.use('/ticket-forms', ticketForm.routes());
router.use('/ticket-filters', ticketFilter.routes());
router.use('/articles', article.routes());
router.use('/triggers', trigger.routes());
router.use('/time-triggers', timeTrigger.routes());
router.use('/replies', reply.routes());

getControllers().forEach((controller) => {
  applyController(router, controller);
});

export default router;
