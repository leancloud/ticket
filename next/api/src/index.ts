import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';

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

// The CORS middleware must be applied to the app
// See https://github.com/firefox-devtools/profiler-server/pull/40
const allowedOrigins = process.env.CORS_ORIGIN?.split(',');
app.use(
  cors({
    origin: allowedOrigins
      ? (ctx) => {
          if (
            ctx.request.header.origin &&
            allowedOrigins.indexOf(ctx.request.header.origin) !== -1
          ) {
            return ctx.request.header.origin;
          }
          return '';
        }
      : undefined,
    keepHeadersOnError: true,
  })
);

app.use(api.routes()).use(api.allowedMethods());
