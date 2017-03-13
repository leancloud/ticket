const router = require('express').Router()
const Promise = require('bluebird')
const AV = require('leanengine')

const mailgun = require('./mail').mailgun

if (process.env.NODE_ENV !== 'development') {
  router.post('/*', function (req, res, next) {
    const body = req.body
    if (!mailgun.validateWebhook(body.timestamp, body.token, body.signature)) {
      console.error('Request came, but not from Mailgun')
      res.send({ error: { message: 'Invalid signature. Are you even Mailgun?' } })
      return
    }
    next()
  })
}

router.post('/catchall', function (req, res, next) {
  Promise.all([
    getFromUser(req.body),
    getTicket(req.body),
  ]).spread((fromUser, ticket) => {
    return new AV.Object('Reply').save({
      ticket,
      content: req.body['stripped-text'].replace(/\r\n/g, '\n')
    }, {user: fromUser})
  }).then(() => {
    res.send('OK')
  }).catch(next)
})

const getTicket = (mail) => {
  const match = mail.Subject.match(/.*\s\(#(\d+)\)$/)
  if (match) {
    return new AV.Query('Ticket').equalTo('nid', parseInt(match[1])).first({useMasterKey: true})
  }
  return Promise.resolve()
}

const getFromUser = (mail) => {
  const match = mail.From.match(/^.*<(.*)>$/)
  if (match) {
    return new AV.Query('_User').equalTo('email', match[1]).first({useMasterKey: true})
    .then((user) => {
      // 为了获取 sessionToken
      return user.fetch({}, {useMasterKey: true})
    })
  }
  return Promise.resolve()
}

module.exports = router
