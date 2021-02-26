const express = require('express')
const favicon = require('serve-favicon')
const path = require('path')
const bodyParser = require('body-parser')
const compression = require('compression')
const Raven = require('raven')
const AV = require('leanengine')

const config = require('./config')

Raven.config(config.sentryDSN).install()

const app = express()
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
app.use(compression())
app.use(Raven.requestHandler())

// 加载云引擎中间件
app.use(AV.express())

app.enable('trust proxy')
app.use(AV.Cloud.HttpsRedirect())

app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use(require('./api'))

const orgName = require('./api/oauth').orgName

const getIndexPage = () => {
  return `
<!doctype html public "storage">
<html>
<meta charset=utf-8/>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LeanTicket</title>
<link rel="stylesheet" href="/css/highlight.default.min.css">
<link rel="stylesheet" href="/css/leancloud-base.css">
<link rel="stylesheet" href="/css/react-datepicker.css">
<link rel="stylesheet" href="/index.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/docsearch.js/2/docsearch.min.css" />
<link rel="stylesheet" href="${process.env.WEBPACK_DEV_SERVER || ''}/app.css">
<link rel="stylesheet" href="/css/docsearch-override.css">
<script src="/js/jquery.min.js"></script>
<script src="/js/bootstrap.min.js"></script>
<div id=app></div>
<script>
  INTEGRATIONS = ${JSON.stringify(config.integrations.map(t => t.name))}
  LEANCLOUD_APP_ID = '${process.env.LEANCLOUD_APP_ID}'
  LEANCLOUD_APP_KEY = '${process.env.LEANCLOUD_APP_KEY}'
  LEANCLOUD_API_HOST = ${process.env.LEANCLOUD_API_HOST ? ('"' + process.env.LEANCLOUD_API_HOST + '"') : undefined}
  LEANCLOUD_APP_ENV = '${process.env.LEANCLOUD_APP_ENV}'
  LEANCLOUD_OAUTH_REGION = '${process.env.LEANCLOUD_REGION == 'US' ? 'us-w1': 'cn-n1'}'
  LEAN_CLI_HAVE_STAGING = '${process.env.LEAN_CLI_HAVE_STAGING}'
  SENTRY_DSN_PUBLIC = '${config.sentryDSNPublic || ''}'
  ORG_NAME = '${orgName}'
  USE_OAUTH = ${!!process.env.OAUTH_KEY}
  ENABLE_LEANCLOUD_INTEGRATION = ${!!process.env.ENABLE_LEANCLOUD_INTEGRATION}
  ALGOLIA_API_KEY = '${process.env.ALGOLIA_API_KEY}'
  FAQ_VIEWS = '${process.env.FAQ_VIEWS || ''}'
  SUPPORT_EMAIL = '${config.supportEmail || ''}'
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
</script>
`
}

app.get('*', function (req, res) {
  res.send(getIndexPage())
})

app.use(Raven.errorHandler())

// error handlers
app.use(function(err, req, res, _next) {
  var statusCode = err.status || 500
  if (statusCode === 500) {
    console.error(err.stack || err)
  }
  res.status(statusCode)
  var error = {}
  res.send({
    message: err.message,
    error: error
  })
})

var PORT = parseInt(process.env.LEANCLOUD_APP_PORT || process.env.PORT || 8080)
app.listen(PORT, function() {
  console.log('LeanTicket server running on:' + PORT)
})
