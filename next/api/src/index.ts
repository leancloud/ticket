import Koa from 'koa';
import bodyParser from 'koa-bodyparser';

import './leancloud';
import './config';
import api from './router';

export const app = new Koa();

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    const status = error.status || 500;
    ctx.status = status;
    ctx.body = { message: error.message };
    if (status >= 500) {
      console.error(error);
    }
  }
});

app.use(bodyParser());
app.use(api.routes()).use(api.allowedMethods());
