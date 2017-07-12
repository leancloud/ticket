const express = require('express')
const favicon = require('serve-favicon')
const path = require('path')
const bodyParser = require('body-parser')
const compression = require('compression')
const uuid = require('uuid/v4')
const AV = require('leanengine')

const app = express()
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
app.use(compression())

// 加载云引擎中间件
app.use(AV.express())

app.enable('trust proxy')
app.use(AV.Cloud.HttpsRedirect())

app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use(require('./api'))

const getIndexPage = (uuid) => {
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
<link rel="stylesheet" href="${process.env.WEBPACK_DEV_SERVER || ''}/app.css">
<script src="/js/jquery.min.js"></script>
<script src="/js/bootstrap.min.js"></script>
<div id=app></div>
<script>
  SENTRY_PUB_DSN = '${process.env.SENTRY_PUB_DSN}'
  LEANCLOUD_APP_ID = '${process.env.LEANCLOUD_APP_ID}'
  LEANCLOUD_APP_KEY = '${process.env.LEANCLOUD_APP_KEY}'
  LEANCLOUD_APP_ENV = '${process.env.LEANCLOUD_APP_ENV}'
  UUID = '${uuid}'
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
  res.send(getIndexPage(uuid()))
})

var PORT = parseInt(process.env.LEANCLOUD_APP_PORT || process.env.PORT || 8080)
app.listen(PORT, function() {
  console.log('LeanTicket server running on:' + PORT)
})
