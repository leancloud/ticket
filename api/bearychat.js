const request = require('request-promise')

const config = require('../config')
const common = require('./common')
const errorHandler = require('./errorHandler')

const COLORS = {
  primary: '#337ab7',
  success: '#5cb85c',
  info: '#5bc0de',
  warning: '#f0ad4e',
  danger: '#d9534f',
}

exports.newTicket = (ticket, from, to) => {
  const data = {
    text: `LeanTicket: [[${ticket.get('category').name}] #${ticket.get('nid')}](${common.getTicketUrl(ticket)}): ${from.get('username')} 提交新工单`,
    attachments: [{
      title: ticket.get('title'),
      text: ticket.get('content'),
      color: COLORS.warning,
    }]
  }
  return Promise.all([
    send(config.bearychatGlobalHookUrl, data),
    send(to.get('bearychatUrl'), data),
  ])
}

exports.replyTicket = (ticket, reply, from, to) => {
  const data = {
    text: `LeanTicket: [[${ticket.get('category').name}] #${ticket.get('nid')}](${common.getTicketUrl(ticket)}): ${from.get('username')} 回复工单`,
    attachments: [{
      title: ticket.get('title'),
      text: reply.get('content'),
      color: COLORS.warning,
    }]
  }
  return Promise.all([
    send(config.bearychatGlobalHookUrl, data),
    send(to.get('bearychatUrl'), data),
  ])
}

exports.changeAssignee = (ticket, from ,to) => {
  const data = {
    text: `LeanTicket: [[${ticket.get('category').name}] #${ticket.get('nid')}](${common.getTicketUrl(ticket)}): ${from.get('username')} 将工单转交给 ${to.get('username')}`,
    attachments: [{
      title: ticket.get('title'),
      text:
        `该工单的问题：

${ticket.get('content')}

最后一条回复：

${ticket.get('latestReply') && ticket.get('latestReply').content}
`,
      color: COLORS.warning,
    }]
  }
  return Promise.all([
    send(config.bearychatGlobalHookUrl, data),
    send(to.get('bearychatUrl'), data),
  ])
}

const send = (url, params) => {
  if (!url) {
    return Promise.resolve()
  }
  return request({
    url,
    method: 'POST',
    body: params,
    json: true,
  }).catch((err) => {
    errorHandler.captureException({
      action: 'send_bearychat_message',
      params
    }, err)
  })
}
