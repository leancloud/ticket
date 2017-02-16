const express = require('express')
const path = require('path')
const compression = require('compression')
import React from 'react'
import { renderToString } from 'react-dom/server'
import { match, RouterContext } from 'react-router'
import routes from './modules/routes'


var app = express()
app.use(compression())
app.use(express.static(path.join(__dirname, 'public')))

app.use(require('./api'))

app.get('*', function (req, res) {
  match({ routes: routes, location: req.url }, (err, redirect, props) => {
    if (err) {
      res.status(500).send(err.message)
    } else if (redirect) {
      res.redirect(redirect.pathname + redirect.search)
    } else if (props) {
      const appHtml = renderToString(<RouterContext {...props}/>)
      res.send(renderPage(appHtml))
    } else {
      res.status(404).send('Not Found')
    }
  })
})

function renderPage(appHtml) {
  return `
    <!doctype html public="storage">
    <html>
    <meta charset=utf-8/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>LeanTicket</title>
    <link rel=stylesheet href=/index.css>
    <link rel="stylesheet" href="https://cdn.bootcss.com/bootstrap/3.3.7/css/bootstrap.min.css">
    <script src="https://cdn.bootcss.com/jquery/1.12.4/jquery.min.js"></script>
    <script src="https://cdn.bootcss.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
    <div id=app class="container">${appHtml}</div>
    <script src="/bundle.js"></script>
   `
}

var PORT = parseInt(process.env.LEANCLOUD_APP_PORT || process.env.PORT || 8080);
app.listen(PORT, function() {
  console.log('Production Express server running at localhost:' + PORT)
})
