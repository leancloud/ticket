import { Context } from 'koa';
import Router from '@koa/router';
import { Ticket } from '../model/ticket';
import AV from 'leancloud-storage';
import { User } from '../model/user';

const router = new Router();

router.get('/', async (ctx) => {
  const anonymousId = ctx.headers['x-anonymous-id'];
  if (!anonymousId) {
    console.log('x-anonymous-id not exists');
    ctx.throw(401);
  }
  const query = new AV.Query<AV.Object>('_User');
  const user = (
    await query.equalTo('authData.anonymous.id', anonymousId).find({ useMasterKey: true })
  )[0];
  if (!user) {
    console.log('x-anonymous-id user not found');
    ctx.throw(401);
  }

  const unreadTicketQuery = Ticket.query()
    .where('author', '==', User.ptr(user.id!))
    .where('unreadCount', '>=', 0);
  const unreadTicket = await unreadTicketQuery.first({ useMasterKey: true });
  const unread = !!unreadTicket;

  ctx.body = unread;
});

export default router;
