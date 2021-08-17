import Router from '@koa/router';
import { Ticket } from '../model/ticket';
import { User } from '../model/user';
import { auth } from '../middleware/auth';

const router = new Router().use(auth);

router.get('/', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;

  const unreadTicketQuery = Ticket.query()
    .where('author', '==', User.ptr(currentUser.id))
    .where('unreadCount', '>=', 1);
  const unreadTicket = await unreadTicketQuery.first({ useMasterKey: true });
  const unread = !!unreadTicket;

  ctx.body = unread;
});

export default router;
