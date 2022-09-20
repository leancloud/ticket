import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import throat from 'throat';
import * as Sentry from '@sentry/node';

import './leancloud';
import { config } from './config';
import { localeMiddleware } from './middleware/locale';
import api from './router';
import { router as integrationRouter } from './integration';
import notification from './notification';
import { OpsLog } from './model/OpsLog';
import { Ticket } from './model/Ticket';
import { getTriggers, getTimeTriggers } from './ticket/automation';
export const app = new Koa();

if (config.sentryDSN) {
  Sentry.init({
    enabled: process.env.NODE_ENV === 'production',
    dsn: config.sentryDSN,
    initialScope: {
      tags: {
        type: 'api',
      },
    },
  });
}

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error: any) {
    const status = error.status || 500;
    if (status >= 500) {
      console.error(error);
      Sentry.withScope(function (scope) {
        scope.addEventProcessor(function (event) {
          return Sentry.Handlers.parseRequest(event, ctx.request);
        });
        Sentry.captureException(error);
      });
    }

    ctx.status = status;
    ctx.body = { message: error.message, code: error.code };
  }
});

app.use(localeMiddleware);
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
    exposeHeaders: ['X-Total-Count'],
  })
);

app.use(api.routes());
app.use(integrationRouter.routes());

// Next 内部还不能定义云函数，临时搞个方法给 Legacy 用
export async function tickDelayNotify() {
  const deadline = new Date(Date.now() - config.sla * 1000 * 60);
  const tickets = await Ticket.queryBuilder()
    .where('status', 'in', [Ticket.Status.NEW, Ticket.Status.WAITING_CUSTOMER_SERVICE])
    .where('updatedAt', '<=', deadline)
    .where('assignee', 'exists')
    .find({ useMasterKey: true });

  const run = throat(5);
  for (const ticket of tickets) {
    run(async () => {
      const opsLog = await OpsLog.queryBuilder()
        .where('ticket', '==', ticket.toPointer())
        .orderBy('createdAt', 'desc')
        .first({ useMasterKey: true });
      if (
        opsLog?.action === 'replySoon' &&
        (!ticket.latestReply || ticket.latestReply.createdAt < opsLog.createdAt)
      ) {
        return;
      }
      notification.notifyDelayNotify({ ticketId: ticket.id });
    });
  }
}

getTriggers().then((triggers) => {
  console.log(`[Trigger] ${triggers?.length} triggers validated`);
});
getTimeTriggers().then((timeTriggers) => {
  console.log(`[TimeTrigger] ${timeTriggers?.length} triggers validated`);
});
