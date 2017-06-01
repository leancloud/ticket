const mail = require('./mail')
const bearychat = require('./bearychat')
const wechat = require('./wechat')
const onlineNotification = require('./onlineNotification')

exports.newTicket = (ticket, author, assignee) => {
  return Promise.all([
    onlineNotification.newTicket(ticket, author, assignee),
    mail.newTicket(ticket, author, assignee),
    bearychat.newTicket(ticket, author, assignee),
    wechat.newTicket(ticket, author, assignee),
  ])
}

exports.replyTicket = (ticket, reply, replyAuthor) => {
  const to = reply.get('isCustomerService') ? ticket.get('author') : ticket.get('assignee')
  const data = {
    ticket,
    reply,
    from: replyAuthor,
    to,
    isCustomerServiceReply: reply.get('isCustomerService'),
  }
  return Promise.all([
    onlineNotification.replyTicket(data),
    mail.replyTicket(data),
    bearychat.replyTicket(data),
    wechat.replyTicket(data),
  ])
}

exports.changeAssignee = (ticket, operator, assignee) => {
  return Promise.all([
    mail.changeAssignee(ticket, operator, assignee),
    bearychat.changeAssignee(ticket, operator, assignee),
    wechat.changeAssignee(ticket, operator, assignee),
  ])
}
