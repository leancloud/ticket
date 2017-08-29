const config = require('../config')
const AV = require('leanengine')

if (!config.mailgunKey || !config.mailgunDomain) {
  console.log('mailgun 的 key 和 domain 没有配置，所以发送邮件功能无法使用。')
} else {
  exports.mailgun = require('mailgun-js')({apiKey: config.mailgunKey, domain: config.mailgunDomain})
}

const common = require('./common')
const errorHandler = require('./errorHandler')

exports.newTicket = (ticket, from, to) => {
  if (!to.get('email')) {
    return Promise.resolve()
  }
  console.log('>>')
  return send({
    from: `${from.get('username')} <ticket@leancloud.cn>`,
    to: to.get('email'),
    subject: `[LeanTicket] ${ticket.get('title')} (#${ticket.get('nid')})`,
    'h:Reply-To': `ticket-${to.id}@leancloud.cn`,
    text: ticket.get('content'),
    url: common.getTicketUrl(ticket),
  })
}

exports.replyTicket = ({ticket, reply, from, to}) => {
  if (!to.get('email')) {
    return Promise.resolve()
  }
  return send({
    from: `${from.get('username')} <ticket@leancloud.cn>`,
    to: to.get('email'),
    subject: `[LeanTicket] ${ticket.get('title')} (#${ticket.get('nid')})`,
    'h:Reply-To': `ticket-${to.id}@leancloud.cn`,
    text: reply.get('content'),
    url: common.getTicketUrl(ticket),
  })
}

exports.changeAssignee = (ticket, from, to) => {
  if (!to.get('email')) {
    return Promise.resolve()
  }
  return send({
    from: `${from.get('username')} <ticket@leancloud.cn>`,
    to: to.get('email'),
    subject: `[LeanTicket] ${ticket.get('title')} (#${ticket.get('nid')})`,
    'h:Reply-To': `ticket-${to.id}@leancloud.cn`,
    text:
      `${from.get('username')} 将该工单转交给您处理。
该工单的问题：

${ticket.get('content')}

该工单最后一条回复：

${ticket.get('latestReply') && ticket.get('latestReply').content || '<暂无>'}
`,
    url: common.getTicketUrl(ticket),
  })
}

const send = (params) => {
  if (!exports.mailgun) {
    return
  }

  return exports.mailgun.messages().send({
    from: params.from,
    to: params.to,
    subject: params.subject,
    'h:Reply-To': params['h:Reply-To'],
    text: `${params.text},
--
您能收到邮件是因为该工单与您相关。
可以直接回复邮件，或者点击 ${params.url} 查看。`,
  })
  .catch((err) => {
    errorHandler.captureException({
      action: 'sendMail',
      params
    }, err)
  })
}
