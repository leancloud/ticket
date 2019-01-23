const request = require('request-promise')

const config = require('../config')
const {getTicketUrl, getUserDisplayName} = require('./common')
const errorHandler = require('./errorHandler')

const COLORS = {
  primary: '#337ab7',
  success: '#5cb85c',
  info: '#5bc0de',
  warning: '#f0ad4e',
  danger: '#d9534f',
}

if (!config.bearychatGlobalHookUrl) {
  console.log('Bearychat 全局 hook URL 没有配置，所以相关消息通知无法使用。')
}

exports.newTicket = (ticket, from, to) => {
  const data = {
    text: `LeanTicket: [#${ticket.get('nid')}](${getTicketUrl(ticket)}): ${getUserDisplayName(from)} 提交新工单`,
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

exports.replyTicket = ({ticket, reply, from, to, isCustomerServiceReply}) => {
  const data = {
    text: `LeanTicket: [#${ticket.get('nid')}](${getTicketUrl(ticket)}): ${getUserDisplayName(from)} 回复工单`,
    attachments: [{
      title: ticket.get('title'),
      text: reply.get('content'),
      color: COLORS.warning,
    }]
  }
  return Promise.all([
    isCustomerServiceReply ? Promise.resolve() : send(config.bearychatGlobalHookUrl, data),
    send(to.get('bearychatUrl'), data),
  ])
}

exports.changeAssignee = (ticket, from ,to) => {
  let content = ticket.get('content')

  if (content.length > 200) {
    content = content.substring(0, 200) + '......'
  }

  let latestReply = ''

  if (ticket.get('latestReply')) {
    latestReply = ticket.get('latestReply').content
  }

  if (latestReply.length > 200) {
    latestReply = latestReply.substring(0, 200) + '......'
  }

  const data = {
    text: `LeanTicket: [#${ticket.get('nid')}](${getTicketUrl(ticket)}): ${getUserDisplayName(from)} 将工单转交给 ${getUserDisplayName(to)}`,
    attachments: [{
      title: ticket.get('title'),
      text: `该工单的问题：\n ${content} \n\n 最后一条回复：\n ${latestReply}`,
      color: COLORS.warning,
    }]
  }

  return Promise.all([
    send(config.bearychatGlobalHookUrl, data),
    send(to.get('bearychatUrl'), data),
  ])
}

exports.delayNotify = (ticket, to) => {
  let content = ticket.get('content')
  if (content.length > 200) {
    content = content.substring(0, 200) + '......'
  }

  let latestReply = ''
  if (ticket.get('latestReply')) {
    latestReply = ticket.get('latestReply').content
  }
  if (latestReply.length > 200) {
    latestReply = latestReply.substring(0, 200) + '......'
  }

  const data = {
    text: `[#${ticket.get('nid')}](${getTicketUrl(ticket)}) 亲爱的 ${getUserDisplayName(to)}，快去回工单，比心👬👬👬`,
    attachments: [{
      title: ticket.get('title'),
      text:
        `该工单的问题：\n ${content} \n\n 最后一条回复：\n ${latestReply}`,
      color: COLORS.warning,
    }]
  }
  
  return Promise.all([
    send(config.bearychatGlobalHookUrl, data),
    send(to.get('bearychatUrl'), data),
  ])
}

exports.ticketEvaluation = (ticket, from, to) => {
  const {star, content} = ticket.get('evaluation')
  const data = {
    text: `LeanTicket: [#${ticket.get('nid')}](${getTicketUrl(ticket)}): ${getUserDisplayName(from)} 评价工单`,
    attachments: [{
      title: ticket.get('title'),
      text:
`结果：${star === 1 ? '👍'  : '👎'  }
附言：${content}
`,
      color: star === 1 ? COLORS.success : COLORS.danger,
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
