import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import throat from 'throat';
import domain from 'domain';
import { Minimatch } from 'minimatch';
import { Sentry } from './sentry';
import { extractTraceparentData, stripUrlQueryAndFragment } from '@sentry/tracing';

import './leancloud';
import { config } from './config';
import { localeMiddleware } from './middleware/locale';
import { router as integrationRouter } from './integration';
import notification from './notification';
import { OpsLog } from './model/OpsLog';
import { Ticket } from './model/Ticket';
import { getTriggers, getTimeTriggers } from './ticket/automation';

import './ticket-form';
import './tap-support';
import api from './router';
import { apiLogMiddleware } from './api-log';

export const app = new Koa();
app.proxy = true;

// not mandatory, but adding domains does help a lot with breadcrumbs
const requestHandler: Koa.Middleware = (ctx, next) => {
  return new Promise((resolve, reject) => {
    const local = domain.create();
    local.add(ctx as any);
    local.on('error', (err) => {
      ctx.status = err.status || 500;
      ctx.body = err.message;
      ctx.app.emit('error', err, ctx);
      reject(err);
    });
    local.run(async () => {
      Sentry.getCurrentHub().configureScope((scope) =>
        scope.addEventProcessor((event) =>
          Sentry.addRequestDataToEvent(event, ctx.request, {
            include: {
              user: false,
            },
          })
        )
      );
      await next();
      resolve(undefined);
    });
  });
};

// this tracing middleware creates a transaction per request
const tracingMiddleWare: Koa.Middleware = async (ctx, next) => {
  const reqMethod = (ctx.method || '').toUpperCase();
  const reqUrl = ctx.url && stripUrlQueryAndFragment(ctx.url);

  // connect to trace of upstream app
  let traceparentData;
  if (ctx.request.get('sentry-trace')) {
    traceparentData = extractTraceparentData(ctx.request.get('sentry-trace'));
  }

  const transaction = Sentry.startTransaction({
    name: `${reqMethod} ${reqUrl}`,
    op: 'http.server',
    ...traceparentData,
  });

  ctx.__sentry_transaction = transaction;

  // We put the transaction on the scope so users can attach children to it
  Sentry.getCurrentHub().configureScope((scope) => {
    scope.setSpan(transaction);
  });

  ctx.res.on('finish', () => {
    // Push `transaction.finish` to the next event loop so open spans have a chance to finish before the transaction closes
    setImmediate(() => {
      // if using koa router, a nicer way to capture transaction using the matched route
      if (ctx._matchedRoute) {
        const mountPath = ctx.mountPath || '';
        transaction.setName(`${reqMethod} ${mountPath}${ctx._matchedRoute}`);
      }
      transaction.setHttpStatus(ctx.status);
      transaction.finish();
    });
  });

  await next();
};

app.use(requestHandler);
app.use(tracingMiddleWare);

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error: any) {
    const status = error.status || 500;
    if (status >= 500) {
      console.error(error);
      Sentry.withScope(function (scope) {
        scope.addEventProcessor(function (event) {
          return Sentry.addRequestDataToEvent(event, ctx.request);
        });
        Sentry.captureException(error);
      });
    }

    ctx.status = status;
    ctx.body = { message: error.message, code: error.code, numCode: error.numCode };
  }
});

app.use(localeMiddleware);
app.use(bodyParser());

if (process.env.ENABLE_API_LOG) {
  app.use(apiLogMiddleware());
}

// The CORS middleware must be applied to the app
// See https://github.com/firefox-devtools/profiler-server/pull/40
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(
  (pattern) => new Minimatch(pattern)
);
app.use(
  cors({
    origin: allowedOrigins
      ? (ctx) => {
          const { origin } = ctx.request.header;
          if (origin && allowedOrigins.some((allowedOrigin) => allowedOrigin.match(origin))) {
            return origin;
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
