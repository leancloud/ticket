const http = require('http')
const express = require('express')
const favicon = require('serve-favicon')
const path = require('path')
const compression = require('compression')
const AV = require('leanengine')
const swaggerUi = require('swagger-ui-express')
const YAML = require('yamljs')

AV.init({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY,
  masterKey: process.env.LEANCLOUD_APP_MASTER_KEY,
})
AV.setProduction(process.env.NODE_ENV === 'production')

const config = require('./config')
const { clientGlobalVars } = require('./clientGlobalVar')

const app = express()
const apiRouter = require('./api')

const { Sentry, Tracing } = require('./next/api/dist/sentry')
if (config.sentryDSN) {
  Sentry.init({
    enabled: process.env.NODE_ENV === 'production',
    dsn: config.sentryDSN,
    environment: process.env.TICKET_HOST?.replace('https://', '')?.replace('/', ''),
    initialScope: {
      tags: {
        type: 'api',
      },
    },
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true, breadcrumbs: false }),
      new Tracing.Integrations.Express({
        // specify the routes you want to trace:
        router: apiRouter,
      }),
    ],
    tracesSampler: (samplingContext) => {
      if ('GET /' === samplingContext?.transactionContext?.name) {
        // Drop this transaction, by setting its sample rate to 0%
        return 0
      } else {
        // Default sample rate for all others (replaces tracesSampleRate)
        return Number(process.env.SENTRY_SAMPLE_RATE ?? 0.05)
      }
    },
  })
}

if (process.env.MAINTENANCE_MODE) {
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public/maintenance-mode.html')))
} else {
  // in-app pages
  app.use('/in-app/v1', express.static(path.join(__dirname, 'in-app/v1/dist')))
  const inAppIndexPage = path.join(__dirname, 'in-app/v1/dist/index.html')
  app.get('/in-app/v1/*', (req, res) => res.sendFile(inAppIndexPage))

  // next pages
  app.use('/next', express.static(path.join(__dirname, 'next/web/dist')))
  const nextWebIndexPage = path.join(__dirname, 'next/web/dist/index.html')
  app.get('/next/*', (req, res) => res.sendFile(nextWebIndexPage))

  app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
  app.use(compression())
  app.use(Sentry.Handlers.requestHandler())

  // 加载云引擎中间件
  app.use(AV.express())

  app.disable('x-powered-by')
  app.enable('trust proxy')
  app.use(AV.Cloud.HttpsRedirect())

  app.use(express.static(path.join(__dirname, 'public')))
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))

  // oauth
  app.use(require('./oauth'))

  // api document
  const APIV1 = YAML.load('./docs/api1.yml')
  const APIV2 = YAML.load('./docs/api2.yml')
  app.use('/docs/1', swaggerUi.serveFiles(APIV1), swaggerUi.setup(APIV1))
  app.use('/docs/2', swaggerUi.serveFiles(APIV2), swaggerUi.setup(APIV2))

  // legacy api
  app.use(Sentry.Handlers.tracingHandler())
  app.use(apiRouter)

  const { orgName } = require('./oauth/lc')

  const BRAND_NAME = process.env.BRAND_NAME || 'TapSupport'

  const getIndexPage = () => {
    return `<!doctype html>
<html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
<title>${BRAND_NAME}</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.10.0/styles/github.min.css">
<link rel="stylesheet" href="/index.css">
<link rel="stylesheet" href="/css/docsearch.min.css" />
<link rel="stylesheet" href="/css/docsearch-override.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/4.0.0/github-markdown.min.css" integrity="sha512-Oy18vBnbSJkXTndr2n6lDMO5NN31UljR8e/ICzVPrGpSud4Gkckb8yUpqhKuUNoE+o9gAb4O/rAxxw1ojyUVzg==" crossorigin="anonymous" />
<link rel="stylesheet" href="${process.env.WEBPACK_DEV_SERVER || ''}/app.css">
<link rel="stylesheet" href="/css/leancloud-compatible.css">
<div id=app></div>
<script>
  Object.assign(window, ${JSON.stringify(clientGlobalVars)})
  LEAN_CLI_HAVE_STAGING = '${process.env.LEAN_CLI_HAVE_STAGING}'
  SENTRY_DSN_PUBLIC = '${config.sentryDSNPublic || ''}'
  ORG_NAME = '${orgName}'
  USE_LC_OAUTH = ${!!process.env.OAUTH_KEY}
  ALGOLIA_API_KEY = '${process.env.ALGOLIA_API_KEY || ''}'
  FAQ_VIEWS = '${process.env.FAQ_VIEWS || ''}'
  BRAND_NAME = '${BRAND_NAME}'
</script>
<script src='${process.env.WEBPACK_DEV_SERVER || ''}/bundle.js'></script>
<script>
  window.addEventListener('load', function () {
    if (window.Notification && Notification.permission !== "granted") {
      Notification.requestPermission(function (status) {
        if (Notification.permission !== status) {
          Notification.permission = status;
        }
      });
    }
  })
</script>`
  }

  app.get('*', function (req, res) {
    res.send(getIndexPage())
  })
}

app.use(Sentry.Handlers.errorHandler())

// error handlers
app.use(function (err, req, res, _next) {
  var statusCode = err.status || 500
  if (statusCode === 500) {
    console.error(err.stack || err)
  }
  res.status(statusCode).json({ message: err.message })
})

require('./api/launch')
  .ready()
  .then(() => {
    const nextPaths = [
      '/api/2',
      // used by mailgun
      '/webhooks',
      // used by slack-plus, jira
      '/integrations',
    ]
    const shouldHandledByNextApp = (req) => nextPaths.some((path) => req.url.startsWith(path))

    const nextApp = require('./next/api/dist').app
    const nextAppHandler = nextApp.callback()

    const server = http.createServer((req, res) => {
      if (shouldHandledByNextApp(req)) {
        nextAppHandler(req, res)
      } else {
        app.handle(req, res)
      }
    })

    const PORT = parseInt(process.env.LEANCLOUD_APP_PORT || process.env.PORT || '3000')
    server.listen(PORT, () => {
      console.log('[TapDesk] Server running on:', PORT)
    })
    return
  })
  .catch((error) => console.error(`[ERROR] Failed to launch server:`, error))
