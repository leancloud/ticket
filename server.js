const express = require('express')
const favicon = require('serve-favicon')
const path = require('path')
const compression = require('compression')
const Raven = require('raven')
const AV = require('leanengine')
const { createProxyMiddleware } = require('http-proxy-middleware')
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
const { refreshWebhooks } = require('./api/webhook')
const { Trigger, Triggers } = require('./api/rule/trigger')
const { Automation, Automations } = require('./api/rule/automation')

Raven.config(config.sentryDSN).install()

const app = express()

if (process.env.MAINTENANCE_MODE) {
  app.get('*',  (req, res) => res.sendFile(path.join(__dirname, 'public/maintenance-mode.html')))
} else {
  // in-app pages
  app.use('/in-app/v1', express.static(path.join(__dirname, 'in-app/v1/dist')))
  const inAppIndexPage = path.join(__dirname, 'in-app/v1/dist/index.html')
  app.get('/in-app/v1/*', (req, res) => res.sendFile(inAppIndexPage))

  // next api
  require('./next/server')
  app.use(
    '/api/2',
    createProxyMiddleware({
      target: 'http://127.0.0.1:4000',
      changeOrigin: true,
    })
  )

  // next pages
  app.use('/next', express.static(path.join(__dirname, 'next/web/dist')))
  const nextWebIndexPage = path.join(__dirname, 'next/web/dist/index.html')
  app.get('/next/*', (req, res) => res.sendFile(nextWebIndexPage))

  app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
  app.use(compression())
  app.use(Raven.requestHandler())

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

  // legacy api
  app.use(require('./api'))

  // api document
  app.use('/docs/1', swaggerUi.serve, swaggerUi.setup(YAML.load('./docs/api1.yml')))

  const { orgName } = require('./oauth/lc')

  const getIndexPage = () => {
    return `<!doctype html>
<html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
<title>LeanTicket</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.10.0/styles/github.min.css">
<link rel="stylesheet" href="/css/react-datepicker.css">
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

app.use(Raven.errorHandler())

// error handlers
app.use(function (err, req, res, _next) {
  var statusCode = err.status || 500
  if (statusCode === 500) {
    console.error(err.stack || err)
  }
  res.status(statusCode).json({ message: err.message })
})

const PORT = parseInt(process.env.LEANCLOUD_APP_PORT || process.env.PORT || 8080)
app.listen(PORT, function () {
  console.log('LeanTicket server running on:' + PORT)
})

refreshWebhooks()

Triggers.fetchRaw(true)
  .then((objects) => {
    let succeeded = 0
    let failed = 0
    objects.forEach((object) => {
      try {
        new Trigger(object.toJSON())
        succeeded++
      } catch {
        failed++
      }
    })
    console.log(`[Trigger]: triggers validated (${succeeded} succeeded, ${failed} failed)`)
    return
  })
  .catch(console.error)

Automations.fetchRaw(true)
  .then((objects) => {
    let succeeded = 0
    let failed = 0
    objects.forEach((object) => {
      try {
        new Automation(object.toJSON())
        succeeded++
      } catch {
        failed++
      }
    })
    console.log(`[Automation]: automations validated (${succeeded} succeeded, ${failed} failed)`)
    return
  })
  .catch(console.error)
