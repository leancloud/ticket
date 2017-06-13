const config = require('../config')
const AV = require('leanengine')
const mailgun = require('mailgun-js')({apiKey: config.mailgunKey, domain: config.mailgunDomain})

const common = require('./common')
const errorHandler = require('./errorHandler')

exports.mailgun = mailgun

exports.newTicket = (ticket, from, to) => {
  if (!to.get('email')) {
    return Promise.resolve()
  }
  return send({
    from: `${from.get('username')} <ticket-${to.id}@leancloud.cn>`,
    to: to.get('email'),
    subject: `[LeanTicket] ${ticket.get('title')} (#${ticket.get('nid')})`,
    text: ticket.get('content'),
    url: common.getTicketUrl(ticket),
  })
}

exports.replyTicket = ({ticket, reply, from, to}) => {
  if (!to.get('email')) {
    return Promise.resolve()
  }
  return send({
    from: `${from.get('username')} <ticket-${to.id}@leancloud.cn>`,
    to: to.get('email'),
    subject: `[LeanTicket] ${ticket.get('title')} (#${ticket.get('nid')})`,
    text: reply.get('content'),
    url: common.getTicketUrl(ticket),
  })
}

exports.changeAssignee = (ticket, from, to) => {
  if (!to.get('email')) {
    return Promise.resolve()
  }
  return send({
    from: `${from.get('username')} <ticket-${to.id}@leancloud.cn>`,
    to: to.get('email'),
    subject: `[LeanTicket] ${ticket.get('title')} (#${ticket.get('nid')})`,
    text:
      `${from.get('username')} 将该工单转交给您处理。
该工单的问题：

${ticket.get('content')}

该工单最后一条回复：

${ticket.get('latestReply') && ticket.get('latestReply').content}
`,
    url: common.getTicketUrl(ticket),
  })
}

const send = (params) => {
  return new Promise((resolve, reject) => {
    mailgun.messages().send({
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: `${params.text}
--
您能收到邮件是因为该工单与您相关。
可以直接回复邮件，或者点击 ${params.url} 查看。`,
    }, function (err, body) {
      new AV.Object('MailLog').save({
        params,
        result: body,
        err,
      })
      if (err) {
        return reject(err)
      }
      resolve(body)
    })
  })
  .catch((err) => {
    errorHandler.captureException({
      action: 'sendMail',
      params
    }, err)
  })
}
