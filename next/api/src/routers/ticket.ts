import Router from '@koa/router';
import Joi from 'joi';

import auth from '../middlewares/auth';
import validate from '../middlewares/validate';
import { LoggedInUser } from '../models/user';
import { Ticket } from '../models/ticket';

const r = new Router({ prefix: '/tickets' }).use(auth);

r.get(
  '/',
  validate({
    query: {
      created_at_gt: Joi.date(),
      created_at_gte: Joi.date(),
      created_at_lt: Joi.date(),
      created_at_lte: Joi.date(),
      status: Joi.custom((value: string) => {
        value.split(',').forEach((v) => Joi.assert(v, Joi.number()));
      }),
    },
  }),
  async (ctx) => {
    const user: LoggedInUser = ctx.state.user;
    const tickets = await Ticket.find(
      {
        authorId: user.id,
      },
      {
        limit: 10,
        authOptions: user.getAuthOptions(),
      }
    );
    ctx.body = tickets.map((ticket) => {
      return {
        id: ticket.id,
        nid: ticket.nid,
        title: ticket.title,
        author: {
          id: ticket.author.id,
          username: ticket.author.username,
          name: ticket.author.name,
        },
      };
    });
  }
);

r.post(
  '/test',
  validate({
    query: {
      key: Joi.string().trim(),
    },
    body: {
      key: Joi.string().trim(),
    },
  }),
  (ctx) => {
    console.log(ctx.request.query, ctx.request.body);
  }
);

export default r;
