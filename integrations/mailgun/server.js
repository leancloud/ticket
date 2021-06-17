/* eslint-disable i18n/no-chinese-character */

const errorHandler = require('../../api/errorHandler')
const { getUserDisplayName, getTicketUrl } = require('../../api/common')
const AV = require('leanengine')
const express = require('express')
const Promise = require('bluebird')

module.exports = (mailgunKey, mailgunDomain) => {
  if (!mailgunKey || !mailgunDomain) {
    throw new Error('mailgun 的 key 或 domain 没有配置')
  }

  const mailgun = require('mailgun-js')({
    apiKey: mailgunKey,
    domain: mailgunDomain,
  })

  const send = (params) => {
    return mailgun
      .messages()
      .send({
        from: params.from,
        to: params.to,
        subject: params.subject,
        'h:Reply-To': params['h:Reply-To'],
        text: `${params.text}

--
您能收到邮件是因为该工单与您相关。
可以直接回复邮件，或者点击 ${params.url} 查看。`,
      })
      .catch((err) => {
        errorHandler.captureException(
          {
            action: 'sendMail',
            params,
          },
          err
        )
      })
  }

  const notificationChannel = {
    newTicket: (ticket, from, to) => {
      if (!to?.get('email')) {
        return Promise.resolve()
      }
      return send({
        from: `${getUserDisplayName(from)} <ticket@leancloud.cn>`,
        to: to.get('email'),
        subject: `[LeanTicket] ${ticket.get('title')} (#${ticket.get('nid')})`,
        'h:Reply-To': `ticket-${to.id}@leancloud.cn`,
        text: ticket.get('content'),
        url: getTicketUrl(ticket),
      })
    },
    replyTicket: ({ ticket, reply, from, to }) => {
      if (!to?.get('email')) {
        return Promise.resolve()
      }
      return send({
        from: `${getUserDisplayName(from)} <ticket@leancloud.cn>`,
        to: to.get('email'),
        subject: `[LeanTicket] ${ticket.get('title')} (#${ticket.get('nid')})`,
        'h:Reply-To': `ticket-${to.id}@leancloud.cn`,
        text: reply.get('content'),
        url: getTicketUrl(ticket),
      })
    },
    changeAssignee: (ticket, from, to) => {
      if (!to?.get('email')) {
        return Promise.resolve()
      }
      return send({
        from: `${getUserDisplayName(from)} <ticket@leancloud.cn>`,
        to: to.get('email'),
        subject: `[LeanTicket] ${ticket.get('title')} (#${ticket.get('nid')})`,
        'h:Reply-To': `ticket-${to.id}@leancloud.cn`,
        text: `${getUserDisplayName(from)} 将该工单转交给您处理。
该工单的问题：

${ticket.get('content')}

该工单最后一条回复：

${ticket.get('latestReply')?.content || '<暂无>'}`,
        url: getTicketUrl(ticket),
      })
    },
    delayNotify: (ticket, to) => {
      if (!to?.get('email')) {
        return Promise.resolve()
      }
      return send({
        from: 'support <ticket@leancloud.cn>',
        to: to.get('email'),
        subject: `亲爱的 ${getUserDisplayName(to)}，快去回工单，比心👬👬👬`,
        text: `该工单的问题：

${ticket.get('content')}

该工单最后一条回复：

${(ticket.get('latestReply') && ticket.get('latestReply').content) || '<暂无>'}
    `,
        url: getTicketUrl(ticket),
      })
    },
  }

  const router = express.Router()

  if (process.env.NODE_ENV !== 'development' && !mailgun) {
    router.post('/*', function (req, res, next) {
      const body = req.body
      if (!mailgun.validateWebhook(body.timestamp, body.token, body.signature)) {
        console.error('Request came, but not from Mailgun')
        res.send({
          error: { message: 'Invalid signature. Are you even Mailgun?' },
        })
        return
      }
      next()
    })
  }

  router.post('/catchall', function (req, res, next) {
    Promise.all([getFromUser(req.body), getTicket(req.body)])
      .spread((fromUser, ticket) => {
        return new AV.Object('Reply').save(
          {
            ticket,
            content: req.body['stripped-text'].replace(/\r\n/g, '\n'),
          },
          { user: fromUser }
        )
      })
      .then(() => {
        return res.send('OK')
      })
      .catch(next)
  })

  const getTicket = (mail) => {
    const match = mail.Subject.match(/.*\s\(#(\d+)\)$/)
    if (match) {
      return new AV.Query('Ticket').equalTo('nid', parseInt(match[1])).first({ useMasterKey: true })
    }
    return Promise.resolve()
  }

  const getFromUser = (mail) => {
    const match = mail.To.match(/^.*<?ticket-(.*)@leancloud.cn>?.*$/)
    if (match) {
      return new AV.Query('_User').get(match[1], { useMasterKey: true }).then((user) => {
        if (!user) {
          throw new Error('user not found, objectId=' + match[1])
        }
        return user
      })
    }
    const err = new Error('user objectId mismatch:' + mail.To)
    new AV.Object('MailLog', {
      from: mail.From,
      to: mail.To,
      subject: mail.Subject,
      body: mail,
      err: err.message,
      ACL: new AV.ACL(),
    }).save()
    throw err
  }

  return {
    name: 'Mailgun',
    notificationChannel,
    routers: [['/webhooks/mailgun', router]],
  }
}
