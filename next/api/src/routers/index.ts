import Router from '@koa/router';

import auth from '../middlewares/auth';
import debug from './debug';
import ticket from './ticket';

const r = new Router({ prefix: '/api/2' });

r.get('/whoami', auth, async (ctx) => {
  ctx.body = ctx.state.user;
});

r.use(debug.routes());
r.use(ticket.routes());

export default r;
