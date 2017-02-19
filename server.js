const express = require('express')
const path = require('path')
const compression = require('compression')

const app = express()
app.use(compression())
app.use(express.static(path.join(__dirname, 'public')))

app.use(require('./api'))

app.get('*', function (req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

var PORT = parseInt(process.env.LEANCLOUD_APP_PORT || process.env.PORT || 8080)
app.listen(PORT, function() {
  console.log('LeanTicket server running on:' + PORT)
})
